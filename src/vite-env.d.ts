/// <reference types="vite/client" />

type GoogleIdentityButtonOptions = {
  type?: 'standard' | 'icon'
  theme?: 'outline' | 'filled_blue' | 'filled_black'
  size?: 'large' | 'medium' | 'small'
  shape?: 'rectangular' | 'pill' | 'circle' | 'square'
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin'
  width?: number | string
}

type GoogleIdentityCredentialResponse = {
  credential?: string
}

interface Window {
  google?: {
    accounts?: {
      id?: {
        initialize: (options: {
          client_id: string
          callback: (response: GoogleIdentityCredentialResponse) => void
        }) => void
        renderButton: (
          parent: HTMLElement,
          options: GoogleIdentityButtonOptions,
        ) => void
      }
    }
  }
}
