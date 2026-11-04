import { Route, Routes } from 'react-router-dom'
import { CabeceraPantalla } from './diseno/CabeceraPantalla'
import { Estructura } from './diseno/Estructura'
import { Galeria } from './diseno/Galeria'

export default function App() {
  return (
    <Routes>
      <Route element={<Estructura />}>
        <Route
          index
          element={<CabeceraPantalla titulo="Historias" hallazgo="Qué ve el radar cuando el agua sube o el bosque arde, y por qué." />}
        />
        <Route
          path="observatorio"
          element={<CabeceraPantalla titulo="Observatorio" hallazgo="Qué cambió aquí entre dos pasadas y cuánto." />}
        />
        <Route path="_sistema" element={<Galeria />} />
        <Route path="*" element={<CabeceraPantalla titulo="Página no encontrada" hallazgo="Esta dirección no existe en la app." />} />
      </Route>
    </Routes>
  )
}
