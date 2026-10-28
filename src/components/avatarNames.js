/* Display names for the profile avatars (platform/profiles.js AVATARS). */
import { t, HYENA_NAME } from '../platform/i18n'

/** The friend's display name (aria labels and the chooser). */
export function avatarName(id) {
  switch (id) {
    case 'anbessa': return 'Anbessa'
    case 'kokeb': return 'Kokeb'
    case 'zebra': return t('kpAvZebra', 'Zebra')
    case 'jibby': return HYENA_NAME
    case 'dog': return t('kpAvDog', 'Dog')
    case 'cat': return t('kpAvCat', 'Cat')
    case 'bird': return t('kpAvBird', 'Bird')
    case 'fish': return t('kpAvFish', 'Fish')
    case 'horse': return t('kpAvHorse', 'Horse')
    case 'camel': return t('kpAvCamel', 'Camel')
    case 'cow': return t('kpAvCow', 'Cow')
    case 'bee': return t('kpAvBee', 'Bee')
    default: return 'Anbessa'
  }
}
