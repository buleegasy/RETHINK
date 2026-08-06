import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import AdminApp from './AdminApp.tsx'
import { preloadFaceModels } from './hooks/useFaceEmotion'

const isAdmin = window.location.pathname.startsWith('/admin');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isAdmin ? <AdminApp /> : <App />}
  </StrictMode>,
)

// 应用启动后，在浏览器空闲时静默预加载人脸识别模型。
// 这样当用户打开摄像头时，模型已就绪，不再需要等待。
if (!isAdmin) {
  preloadFaceModels();
}

