import { db } from '../firebase';
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';

// Definimos el nombre de la colección en Firestore
const coleccionProveedores = collection(db, 'proveedores');

// Función para obtener todos los proveedores
export const obtenerProveedores = async () => {
  const querySnapshot = await getDocs(coleccionProveedores);
  const proveedores = [];
  querySnapshot.forEach((doc) => {
    proveedores.push({ id: doc.id, ...doc.data() });
  });
  return proveedores;
};

// Función para crear un proveedor nuevo
export const crearProveedor = async (datosProveedor) => {
  const docRef = await addDoc(coleccionProveedores, {
    ...datosProveedor,
    activo: true,
    createdAt: new Date().toISOString()
  });
  return docRef.id;
};