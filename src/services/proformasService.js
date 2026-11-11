import { db } from '../firebase';
import { collection, addDoc, getDocs, query, where, updateDoc, doc } from 'firebase/firestore';

const coleccionProformas = collection(db, 'proformas');

export const obtenerProformas = async () => {
  const querySnapshot = await getDocs(coleccionProformas);
  const proformas = [];
  querySnapshot.forEach((doc) => {
    proformas.push({ id: doc.id, ...doc.data() });
  });
  return proformas;
};

export const obtenerProformaPorExpediente = async (expedienteId) => {
  const q = query(coleccionProformas, where("expedienteId", "==", expedienteId));
  const querySnapshot = await getDocs(q);
  if (!querySnapshot.empty) {
    return { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() };
  }
  return null;
};

export const crearProforma = async (datosProforma) => {
  const docRef = await addDoc(coleccionProformas, {
    ...datosProforma,
    createdAt: new Date().toISOString()
  });
  return docRef.id;
};

// 🔥 NUEVA FUNCIÓN PARA ACTUALIZAR
export const actualizarProforma = async (proformaId, datosActualizados) => {
  const proformaRef = doc(db, 'proformas', proformaId);
  await updateDoc(proformaRef, {
    ...datosActualizados,
    updatedAt: new Date().toISOString()
  });
};