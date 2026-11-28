# Frontend - Gestor de tareas multi-tenant

Aplicación en Next.js (React, App Router) que consume la API REST del backend y autentica con Amazon Cognito.

## Ejecución en local

```bash
cd frontend
npm install
cp .env.example .env.local   # completar con los valores reales
npm run dev
```

Abre `http://localhost:3000`. Requiere el backend corriendo en `NEXT_PUBLIC_API_URL`.

## Variables de entorno

| Variable | Descripción |
| --- | --- |
| NEXT_PUBLIC_API_URL | URL base de la API (local: http://localhost:8080) |
| NEXT_PUBLIC_COGNITO_REGION | Región del User Pool (us-east-1) |
| NEXT_PUBLIC_COGNITO_USER_POOL_ID | ID del User Pool |
| NEXT_PUBLIC_COGNITO_CLIENT_ID | ID del app client (sin secreto) |

Las variables `NEXT_PUBLIC_*` se incrustan al compilar, por lo que deben definirse antes de `npm run build`.

## Estructura del proyecto

| Ruta | Función |
| --- | --- |
| `app/layout.js` | Componente raíz: define el HTML base y envuelve todas las páginas |
| `app/page.js` | Inicio: redirige a `/teams` si hay sesión o a `/login` si no |
| `app/login/page.js` | Pantalla de inicio de sesión con Cognito |
| `app/teams/page.js` | Lista de equipos del usuario y creación de equipos (solo grupo admin) |
| `app/team/page.js` | Miembros de un equipo (`?id=`): listar, agregar y quitar |
| `app/tasks/page.js` | Tareas de un equipo (`?team=`): crear, filtrar, cambiar estado y eliminar |
| `lib/cognito.js` | Cliente de Cognito: login, sesión y cierre de sesión |
| `lib/api.js` | Función `apiFetch`: llama a la API con el ID token en `Authorization: Bearer` |
| `app/globals.css` | Estilos globales |
| `public/` | Archivos estáticos |
| `next.config.mjs` | Configuración de Next.js |

## Configuración de `next.config.mjs`

- `output: 'export'`: genera un sitio estático en la carpeta `out/`, que se publica en S3 + CloudFront.
- `trailingSlash: true`: genera `login/index.html`, `teams/index.html`, etc., que S3 sirve sin reglas extra.
- `images: { unoptimized: true }`: el optimizador de imágenes necesita un servidor y no existe en un sitio estático.

Por el export estático no se usan rutas dinámicas: el id del equipo viaja como parámetro (`/team?id=3`, `/tasks?team=3`).

## Autenticación

1. `login()` autentica contra Cognito y obtiene el ID token.
2. El token incluye el grupo (`cognito:groups`): `admin` o `miembro`.
3. `apiFetch()` lo envía en cada petición; el backend valida la firma con las claves públicas del User Pool.
4. La interfaz solo muestra "Crear equipo" a quienes pertenecen al grupo `admin`; la validación real la hace el backend.

## Compilación y despliegue

```bash
npm run build   # genera out/
aws s3 sync out/ s3://<bucket> --delete
```

Después se invalida la caché de CloudFront.
