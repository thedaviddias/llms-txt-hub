import { xai } from '@ai-sdk/xai'
import { customProvider } from 'ai'

// custom provider with different model settings:
export const model = customProvider({
  languageModels: {
    'grok-2-1212': xai('grok-2-1212')
  }
})

export type modelID = Parameters<(typeof model)['languageModel']>['0']
