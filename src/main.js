import './style.css'
import javascriptLogo from './javascript.svg'
import viteLogo from '/vite.svg'
import { setupCounter } from './counter.js'
import { setupAuthModal } from './components/AuthModal.js'
import { getUser, signOut, onAuthStateChange } from './services/auth.js'

const app = document.querySelector('#app')

const renderProtectedApp = (user) => {
  app.innerHTML = `
    <div>
      <div style="display: flex; justify-content: flex-end; padding: 1rem;">
        <span style="margin-right: 1rem; align-self: center;">${user.email}</span>
        <button id="logout">Sign Out</button>
      </div>
      <a href="https://vite.dev" target="_blank">
        <img src="${viteLogo}" class="logo" alt="Vite logo" />
      </a>
      <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript" target="_blank">
        <img src="${javascriptLogo}" class="logo vanilla" alt="JavaScript logo" />
      </a>
      <h1>Hello Vite!</h1>
      <div class="card">
        <button id="counter" type="button"></button>
      </div>
      <p class="read-the-docs">
        Click on the Vite logo to learn more
      </p>
    </div>
  `

  document.querySelector('#logout').addEventListener('click', async () => {
    await signOut()
  })

  setupCounter(document.querySelector('#counter'))
}

const renderAuth = () => {
  app.innerHTML = `
    <h1>Blackboard</h1>
    <p>Please sign in to continue</p>
    <div id="auth-container"></div>
  `
  setupAuthModal(document.querySelector('#auth-container'))
}

const init = async () => {
  const user = await getUser()
  if (user) {
    renderProtectedApp(user)
  } else {
    renderAuth()
  }
}

init()

onAuthStateChange((event, session) => {
  if (session?.user) {
    renderProtectedApp(session.user)
  } else {
    renderAuth()
  }
})
