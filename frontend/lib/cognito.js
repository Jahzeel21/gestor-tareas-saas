import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
} from 'amazon-cognito-identity-js';

const pool = new CognitoUserPool({
  UserPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID,
  ClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID,
});

// Inicia sesión. Devuelve { idToken, groups, email }
export function login(email, password) {
  return new Promise((resolve, reject) => {
    const user = new CognitoUser({ Username: email, Pool: pool });
    const details = new AuthenticationDetails({ Username: email, Password: password });

    user.authenticateUser(details, {
      onSuccess: (session) => {
        const payload = session.getIdToken().decodePayload();
        resolve({
          idToken: session.getIdToken().getJwtToken(),
          groups: payload['cognito:groups'] || [],
          email: payload.email,
        });
      },
      onFailure: (err) => reject(err),
      newPasswordRequired: () =>
        reject(new Error('El usuario debe cambiar su contraseña en Cognito antes de entrar')),
    });
  });
}

// Devuelve la sesión actual (o null si no hay sesión)
export function getSession() {
  return new Promise((resolve) => {
    const user = pool.getCurrentUser();
    if (!user) return resolve(null);
    user.getSession((err, session) => {
      if (err || !session || !session.isValid()) return resolve(null);
      const payload = session.getIdToken().decodePayload();
      resolve({
        idToken: session.getIdToken().getJwtToken(),
        groups: payload['cognito:groups'] || [],
        email: payload.email,
      });
    });
  });
}

export function logout() {
  const user = pool.getCurrentUser();
  if (user) user.signOut();
}