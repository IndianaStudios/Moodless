import { getFirestore, FieldValue, Transaction } from 'firebase-admin/firestore';
import { getFirebaseAdmin } from './verifyAuth.js';

/**
 * Función genérica de Rate Limit basada en Firestore.
 * Utiliza transacciones atómicas para garantizar ventanas temporales precisas
 * sin necesidad de Redis, Valkey ni servicios externos adicionales.
 *
 * Devuelve true si la petición DEBE permitirse, false si DEBE bloquearse (HTTP 429).
 */
export async function checkRateLimit(
  identifier: string,
  limitLimit: number,
  windowSeconds: number
): Promise<boolean> {
  try {
    let adminApp;
    try {
      adminApp = getFirebaseAdmin();
    } catch (error) {
      console.error('Rate limiter unavailable: Firebase Admin could not initialize.', error);
      // Fail closed: los endpoints que usan este limitador pueden generar coste
      // o enviar correos; nunca deben quedar abiertos ante un fallo de infraestructura.
      return false;
    }

    const db = getFirestore(adminApp);
    // Sanear el identificador para que sea un ID de documento válido en Firestore
    const safeDocId = identifier.replace(/[/\\#?]/g, '_');
    const docRef = db.collection('_rate_limits').doc(safeDocId);

    const now = Date.now();
    const windowMs = windowSeconds * 1000;

    const allowed = await db.runTransaction(async (transaction: Transaction) => {
      const snap = await transaction.get(docRef);

      if (!snap.exists) {
        transaction.set(docRef, {
          count: 1,
          resetAt: now + windowMs,
          updatedAt: FieldValue.serverTimestamp(),
        });
        return true;
      }

      const data = snap.data();
      const resetAt = typeof data?.resetAt === 'number' ? data.resetAt : 0;
      const currentCount = typeof data?.count === 'number' ? data.count : 0;

      // Si la ventana temporal ha expirado, reiniciamos el contador
      if (now > resetAt) {
        transaction.set(docRef, {
          count: 1,
          resetAt: now + windowMs,
          updatedAt: FieldValue.serverTimestamp(),
        });
        return true;
      }

      // Si superó el límite, bloqueamos la petición
      if (currentCount >= limitLimit) {
        return false;
      }

      // Incrementamos el contador dentro de la ventana activa
      transaction.update(docRef, {
        count: currentCount + 1,
        updatedAt: FieldValue.serverTimestamp(),
      });
      return true;
    });

    return allowed;
  } catch (error) {
    console.error('Error in Firestore rateLimiter:', error);
    // Fail closed: impedir abuso mientras no se pueda comprobar la cuota.
    return false;
  }
}
