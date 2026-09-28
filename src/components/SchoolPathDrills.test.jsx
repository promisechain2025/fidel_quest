import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { WordBuildScreen, FindFidelScreen, EchoScreen } from './SchoolPathDrills'

const helloWord = { geez: 'ሀሎ', meaningEn: 'hello', familyIds: ['ha', 'le'], unitId: 'u01', kind: null }
const helloTarget = { geez: 'ሀሎ', target: 'ሎ', index: 1, position: 'final', meaningEn: 'hello', familyId: 'le' }

describe('school path drill screens', () => {
  it('builds a word from the syllable tiles', () => {
    const onDone = vi.fn()
    render(
      <WordBuildScreen words={[helloWord]} unitIndex={1} seed={1} soundOn={false} onDone={onDone} onBack={() => {}} />,
    )
    expect(screen.getByRole('heading', { name: 'Word Build' })).toBeInTheDocument()
    expect(screen.getByText('Tap the letters in order')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Letter ሀ' }))
    expect(screen.queryByTestId('word-build-built')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Letter ሎ' }))
    expect(screen.getByTestId('word-build-built')).toBeInTheDocument()
    expect(screen.getByText('You built it!')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Keep going!' }))
    expect(onDone).toHaveBeenCalledOnce()
  })

  it('shakes a wrong tile and still accepts the right one', () => {
    render(
      <WordBuildScreen words={[helloWord]} unitIndex={1} seed={1} soundOn={false} onDone={() => {}} onBack={() => {}} />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Letter ሎ' }))
    expect(screen.getByTestId('word-build-miss')).toHaveTextContent('Not that one')
    fireEvent.click(screen.getByRole('button', { name: 'Letter ሀ' }))
    fireEvent.click(screen.getByRole('button', { name: 'Letter ሎ' }))
    expect(screen.getByText('You built it!')).toBeInTheDocument()
  })

  it('finds the fidel at the end of the word', () => {
    const onDone = vi.fn()
    render(
      <FindFidelScreen targets={[helloTarget]} unitIndex={1} soundOn={false} onDone={onDone} onBack={() => {}} />,
    )
    expect(screen.getByRole('heading', { name: 'Find the letter' })).toBeInTheDocument()
    expect(screen.getByText('Tap this letter in the word')).toBeInTheDocument()
    expect(screen.getByText('It is the last letter')).toBeInTheDocument()
    const letters = screen.getAllByRole('button', { name: 'Letter ሀ' })
    fireEvent.click(letters[0])
    expect(screen.getByTestId('find-fidel-miss')).toHaveTextContent('Look again')
    fireEvent.click(screen.getByRole('button', { name: 'Letter ሎ' }))
    expect(screen.getByTestId('find-fidel-found')).toBeInTheDocument()
    expect(screen.getByText('Yes!')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Keep going!' }))
    expect(onDone).toHaveBeenCalledOnce()
  })

  it('plays an authored echo line, then keep going', () => {
    const onDone = vi.fn()
    const lines = [
      { geez: 'ሀሎ ልቢ።', meaningEn: 'Hello, heart.' },
      { geez: 'ማማ ማይ።', meaningEn: 'Mom, water.' },
    ]
    render(
      <EchoScreen lines={lines} unitIndex={1} soundOn={false} onDone={onDone} onBack={() => {}} />,
    )
    expect(screen.getByRole('heading', { name: 'Echo' })).toBeInTheDocument()
    expect(screen.getByTestId('echo-listen')).toHaveTextContent('Listen, then say it')
    expect(screen.getByText('ሀሎ ልቢ።')).toBeInTheDocument()
    expect(screen.getByText('Hello, heart.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Hear again' }))
    expect(screen.getByTestId('echo-listen')).toBeInTheDocument()
    expect(onDone).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'I said it' }))
    expect(screen.getByTestId('echo-said')).toHaveTextContent('You said it!')
    fireEvent.click(screen.getByRole('button', { name: 'Next line' }))
    expect(screen.getByText('ማማ ማይ።')).toBeInTheDocument()
    expect(screen.getByText('Mom, water.')).toBeInTheDocument()
    expect(screen.getByTestId('echo-listen')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'I said it' }))
    fireEvent.click(screen.getByRole('button', { name: 'Keep going!' }))
    expect(onDone).toHaveBeenCalledOnce()
  })
})
