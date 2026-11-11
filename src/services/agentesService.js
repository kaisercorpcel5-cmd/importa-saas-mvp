import { db } from '../firebase';
import { collection, addDoc, getDocs } from 'firebase/firestore';

const coleccionAgentes = collection(db, 'agentesCarga');

export const obtenerAgentes = async () => {
  const querySnapshot = await getDocs(coleccionAgentes);
  const agentes = [];
  querySnapshot.forEach((doc) => {
    agentes.push({ id: doc.id, ...doc.data() });
  });
  return agentes;
};

export const crearAgente = async (datosAgente) => {
  const docRef = await addDoc(coleccionAgentes, {
    ...datosAgente,
    activo: true,
    createdAt: new Date().toISOString()
  });
  return docRef.id;
};