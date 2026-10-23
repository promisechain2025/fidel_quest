/* DynamoDB single-table store (table: TABLE env, key "pk", GSI "byRep" on
   repKey/createdAt for codes, TTL on "ttl"). Single-use is enforced by
   DynamoDB itself: ConditionExpression status = 'unused' on the write. */
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand, DeleteCommand, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb'

const strip = (o) => { if (!o) return null; const { pk, repKey, ttl, kind, ...rest } = o; return rest }
const isCond = (e) => e?.name === 'ConditionalCheckFailedException'

export function ddbStore({ table = process.env.TABLE, client } = {}) {
  const db = client || DynamoDBDocumentClient.from(new DynamoDBClient({}), { marshallOptions: { removeUndefinedValues: true } })
  const get = async (pk) => (await db.send(new GetCommand({ TableName: table, Key: { pk }, ConsistentRead: true }))).Item || null
  const scanKind = async (kind) => {
    const out = []; let ExclusiveStartKey
    do {
      const r = await db.send(new ScanCommand({ TableName: table, FilterExpression: 'kind = :k', ExpressionAttributeValues: { ':k': kind }, ExclusiveStartKey }))
      out.push(...r.Items); ExclusiveStartKey = r.LastEvaluatedKey
    } while (ExclusiveStartKey)
    return out
  }
  const ttl = (ms) => Math.floor(ms / 1000) + 3600
  return {
    async getRep(id) { return strip(await get(`REP#${id}`)) },
    async putRep(r) { await db.send(new PutCommand({ TableName: table, Item: { pk: `REP#${r.repId}`, kind: 'rep', ...r } })) },
    async listReps() { return (await scanKind('rep')).map(strip).sort((a, b) => a.repId.localeCompare(b.repId)) },
    async putCodeIfNew(c) {
      try {
        await db.send(new PutCommand({ TableName: table, Item: { pk: `CODE#${c.code}`, kind: 'code', repKey: c.repId, ...c }, ConditionExpression: 'attribute_not_exists(pk)' }))
        return true
      } catch (e) { if (isCond(e)) return false; throw e }
    },
    async getCode(code) { return strip(await get(`CODE#${code}`)) },
    async markUsedIfUnused(code, at, household) {
      try {
        await db.send(new UpdateCommand({
          TableName: table, Key: { pk: `CODE#${code}` },
          ConditionExpression: '#s = :u',
          UpdateExpression: 'SET #s = :used, usedAt = :at, household = :hh, devices = :dl',
          ExpressionAttributeNames: { '#s': 'status' },
          ExpressionAttributeValues: { ':u': 'unused', ':used': 'used', ':at': at, ':hh': household, ':dl': household ? [household] : [] },
        }))
        return true
      } catch (e) { if (isCond(e)) return false; throw e }
    },
    /** Atomic: append a device hash only while the code is used, the hash is
        not there yet and the list is under `max`. Older rows with only
        `household` get [household, hh] in the same conditional write. */
    async addDeviceIfRoom(code, hh, at, max, seen = {}) {
      const legacy = !Array.isArray(seen.devices)
      try {
        await db.send(new UpdateCommand(legacy ? {
          TableName: table, Key: { pk: `CODE#${code}` },
          ConditionExpression: '#s = :used AND attribute_not_exists(devices) AND ' + (seen.household ? 'household = :old' : 'attribute_not_exists(household)'),
          UpdateExpression: 'SET devices = :dl, lastRestoreAt = :at',
          ExpressionAttributeNames: { '#s': 'status' },
          ExpressionAttributeValues: { ':used': 'used', ':at': at, ':dl': [seen.household, hh].filter(Boolean).slice(0, max), ...(seen.household ? { ':old': seen.household } : {}) },
        } : {
          TableName: table, Key: { pk: `CODE#${code}` },
          ConditionExpression: '#s = :used AND size(devices) < :max AND NOT contains(devices, :hh)',
          UpdateExpression: 'SET devices = list_append(devices, :one), lastRestoreAt = :at',
          ExpressionAttributeNames: { '#s': 'status' },
          ExpressionAttributeValues: { ':used': 'used', ':max': max, ':hh': hh, ':one': [hh], ':at': at },
        }))
        return true
      } catch (e) { if (isCond(e)) return false; throw e }
    },
    async resetDevices(code, at) {
      try {
        await db.send(new UpdateCommand({
          TableName: table, Key: { pk: `CODE#${code}` }, ConditionExpression: '#s = :used',
          UpdateExpression: 'SET devices = :e, devicesResetAt = :at REMOVE household', ExpressionAttributeNames: { '#s': 'status' },
          ExpressionAttributeValues: { ':used': 'used', ':e': [], ':at': at },
        }))
        return true
      } catch (e) { if (isCond(e)) return false; throw e }
    },
    async voidIfUnused(code, at) {
      try {
        await db.send(new UpdateCommand({
          TableName: table, Key: { pk: `CODE#${code}` }, ConditionExpression: '#s = :u',
          UpdateExpression: 'SET #s = :v, voidedAt = :at', ExpressionAttributeNames: { '#s': 'status' },
          ExpressionAttributeValues: { ':u': 'unused', ':v': 'void', ':at': at },
        }))
        return true
      } catch (e) { if (isCond(e)) return false; throw e }
    },
    async listCodesByRep(repId) {
      const out = []; let ExclusiveStartKey
      do {
        const r = await db.send(new QueryCommand({ TableName: table, IndexName: 'byRep', KeyConditionExpression: 'repKey = :r', ExpressionAttributeValues: { ':r': repId }, ExclusiveStartKey }))
        out.push(...r.Items); ExclusiveStartKey = r.LastEvaluatedKey
      } while (ExclusiveStartKey)
      return out.map(strip)
    },
    async listAllCodes() { return (await scanKind('code')).map(strip) },
    async putOtp(e, r) { await db.send(new PutCommand({ TableName: table, Item: { pk: `OTP#${e}`, kind: 'otp', ttl: ttl(r.exp), ...r } })) },
    async getOtp(e) { return strip(await get(`OTP#${e}`)) },
    async deleteOtp(e) { await db.send(new DeleteCommand({ TableName: table, Key: { pk: `OTP#${e}` } })) },
    async putSession(h, s) { await db.send(new PutCommand({ TableName: table, Item: { pk: `SESS#${h}`, kind: 'sess', ttl: ttl(s.exp), ...s } })) },
    async getSession(h) { return strip(await get(`SESS#${h}`)) },
    async deleteSession(h) { await db.send(new DeleteCommand({ TableName: table, Key: { pk: `SESS#${h}` } })) },
    async hit(key, windowSec) {
      const w = Math.floor(Date.now() / 1000 / windowSec)
      const r = await db.send(new UpdateCommand({
        TableName: table, Key: { pk: `RL#${key}#${w}` }, UpdateExpression: 'ADD n :one SET kind = :k, #t = :t',
        ExpressionAttributeNames: { '#t': 'ttl' }, ExpressionAttributeValues: { ':one': 1, ':k': 'rl', ':t': (w + 1) * windowSec + 60 }, ReturnValues: 'UPDATED_NEW',
      }))
      return r.Attributes.n
    },
  }
}
