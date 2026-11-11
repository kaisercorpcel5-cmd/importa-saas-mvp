import { db } from '../firebase';
import { collection, addDoc, getDocs, query, orderBy } from 'firebase/firestore';

const coleccionExpedientes = collection(db, 'expedientes');

export const obtenerExpedientes = async () => {
  const q = query(coleccionExpedientes, orderBy('createdAt', 'desc'));
  const querySnapshot = await getDocs(q);
  const expedientes = [];
  querySnapshot.forEach((doc) => {
    expedientes.push({ id: doc.id, ...doc.data() });
  });
  return expedientes;
};

export const crearExpediente = async (datosExpediente) => {
  const docRef = await addDoc(coleccionExpedientes, {
    ...datosExpediente,
    etapa: 'cotizacion', // Etapa inicial
    activo: true,
    createdAt: new Date().toISOString()
  });
  return docRef.id;
};