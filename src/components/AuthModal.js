import { signUp, signIn } from '../services/auth'

export function setupAuthModal(element) {
  let isLogin = true

  const render = () => {
    element.innerHTML = `
      <div class="auth-card glass-panel">
        <div class="auth-header">
          <div class="auth-icon">
            <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
            </svg>
          </div>
          <h2>${isLogin ? 'Welcome Back' : 'Create Account'}</h2>
          <p class="auth-subtitle">${isLogin ? 'Sign in to access your blackboard' : 'Join to start your creative journey'}</p>
        </div>
        
        <form id="auth-form" class="auth-form">
          <div class="input-group">
            <label for="email">Email Address</label>
            <div class="input-wrapper">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                <polyline points="22,6 12,13 2,6"></polyline>
              </svg>
              <input type="email" id="email" required placeholder="name@example.com" autocomplete="email">
            </div>
          </div>
          
          <div class="input-group">
            <label for="password">Password</label>
            <div class="input-wrapper">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
              <input type="password" id="password" required placeholder="••••••••" autocomplete="current-password">
            </div>
          </div>

          <button type="submit" class="btn-primary btn-block">
            ${isLogin ? 'Sign In' : 'Sign Up'}
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
          </button>
        </form>

        <div class="auth-footer">
          <p>
            ${isLogin ? "Don't have an account?" : "Already have an account?"}
            <a href="#" id="toggle-mode" class="link-primary">${isLogin ? 'Sign Up' : 'Sign In'}</a>
          </p>
        </div>
        
        <div id="auth-message" class="auth-message"></div>
      </div>
    `

    // Add animation class after render
    requestAnimationFrame(() => {
      element.querySelector('.auth-card').classList.add('animate-in')
    })

    element.querySelector('#toggle-mode').addEventListener('click', (e) => {
      e.preventDefault()
      const card = element.querySelector('.auth-card')
      card.classList.add('animate-out')

      setTimeout(() => {
        isLogin = !isLogin
        render()
      }, 300)
    })

    element.querySelector('#auth-form').addEventListener('submit', async (e) => {
      e.preventDefault()
      const email = e.target.email.value
      const password = e.target.password.value
      const messageEl = element.querySelector('#auth-message')
      const btn = element.querySelector('button[type="submit"]')

      // Loading state
      btn.disabled = true
      btn.innerHTML = `<div class="spinner-sm"></div> Processing...`
      messageEl.textContent = ''
      messageEl.className = 'auth-message'

      try {
        const { data, error } = isLogin
          ? await signIn(email, password)
          : await signUp(email, password)

        if (error) throw error

        messageEl.textContent = isLogin ? 'Signed in successfully!' : 'Check your email for the confirmation link.'
        messageEl.className = 'auth-message success'

        // Success animation
        if (isLogin) {
          btn.innerHTML = `
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                Success
            `
        }
      } catch (error) {
        messageEl.textContent = error.message
        messageEl.className = 'auth-message error'
        btn.disabled = false
        btn.innerHTML = `
            ${isLogin ? 'Sign In' : 'Sign Up'}
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
        `
      }
    })
  }

  render()
}
