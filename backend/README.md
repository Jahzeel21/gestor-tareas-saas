# Backend - Gestor de tareas multi-tenant

API REST en Node.js + Express + PostgreSQL. Autenticación con Amazon Cognito (JWT) y aislamiento de datos por equipo.

## Requisitos

- Node.js 20 o superior
- PostgreSQL 15 o superior

## Ejecución en local

```bash
cd backend
npm install
cp .env.example .env     # editar .env con tus valores reales
psql -U postgres -c "CREATE DATABASE tareasdb;"
psql -U postgres -d tareasdb -f db/schema.sql
npm run dev
```

El servidor queda en `http://localhost:8080`.

## Variables de entorno

| Variable | Descripción | Ejemplo |
| --- | --- | --- |
| PORT | Puerto del servidor | 8080 |
| DB_HOST | Host de PostgreSQL (en AWS, endpoint de RDS) | localhost |
| DB_PORT | Puerto de PostgreSQL | 5432 |
| DB_NAME | Nombre de la base | tareasdb |
| DB_USER | Usuario de la base | postgres |
| DB_PASSWORD | Contraseña (en AWS se lee desde Secrets Manager) | cambia_esto |
| COGNITO_REGION | Región del User Pool | us-east-1 |
| COGNITO_USER_POOL_ID | ID del User Pool | us-east-1_N0ZMDRbNB |

Nunca se suben contraseñas al repositorio: `.env` está en `.gitignore`.

## Autenticación y permisos

Todas las rutas, salvo `/health` y `/health/db`, exigen la cabecera:

```
Authorization: Bearer <ID token de Cognito>
```

El backend valida la firma del JWT con las claves públicas del User Pool y lee el grupo del claim `cognito:groups` (`admin` o `miembro`). La primera vez que un usuario entra, se registra automáticamente en la tabla `users`.

- Grupo `admin` de Cognito: puede crear equipos.
- Rol `admin` dentro de un equipo: puede gestionar miembros y eliminar tareas.
- Todas las consultas se filtran por las membresías del usuario autenticado, así que nadie ve datos de equipos ajenos.

## Endpoints

| Método | Ruta | Descripción | Permiso |
| --- | --- | --- | --- |
| GET | /health | Estado del servidor | Público |
| GET | /health/db | Estado de la conexión a la base | Público |
| GET | /me | Datos del usuario del token | Autenticado |
| POST | /teams | Crear equipo | Grupo admin |
| GET | /teams | Listar mis equipos | Autenticado |
| GET | /teams/:id | Ver un equipo | Miembro |
| GET | /teams/:id/members | Listar miembros | Miembro |
| POST | /teams/:id/members | Agregar miembro por correo | Admin del equipo |
| DELETE | /teams/:id/members/:userId | Quitar miembro | Admin del equipo |
| GET | /teams/:teamId/tasks | Listar tareas (`?status=`) | Miembro |
| POST | /teams/:teamId/tasks | Crear tarea | Miembro |
| GET | /teams/:teamId/tasks/:taskId | Ver tarea | Miembro |
| PUT | /teams/:teamId/tasks/:taskId | Actualizar tarea | Miembro |
| DELETE | /teams/:teamId/tasks/:taskId | Eliminar tarea | Admin del equipo |

Estados válidos de tarea: `pendiente`, `en_progreso`, `completada`.

## Modelo de datos

El script completo está en `db/schema.sql`.

- **users**: id, cognito_sub (único), email (único), name, created_at
- **teams**: id, name, created_by, created_at
- **memberships**: id, team_id, user_id, role (`admin` o `miembro`), único por (team_id, user_id)
- **tasks**: id, team_id, title, description, status, assigned_to, created_by, created_at, updated_at

## Despliegue en AWS

1. Ejecutar `db/schema.sql` en la base RDS.
2. Configurar las variables de entorno en el servidor (EC2 o Beanstalk). `DB_HOST` es el endpoint de RDS y `DB_PASSWORD` se obtiene desde Secrets Manager.
3. Iniciar con `npm start` (puerto 8080, detrás del ALB).