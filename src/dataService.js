import { db, storage, auth } from "./firebase";
import { collection, doc, setDoc, getDocs, deleteDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { compressImage } from "./photoUtils";

export async function saveAnimal(animal) {
  const user = auth.currentUser;
  if (!user) throw new Error("Not logged in");

  const refDoc = doc(db, "users", user.uid, "animals", animal.id);
  await setDoc(refDoc, animal);
}

export async function loadAnimals() {
  const user = auth.currentUser;
  if (!user) return [];

  const snapshot = await getDocs(collection(db, "users", user.uid, "animals"));
  return snapshot.docs.map(d => d.data());
}

export async function deleteAnimal(id) {
  const user = auth.currentUser;
  const refDoc = doc(db, "users", user.uid, "animals", id);
  await deleteDoc(refDoc);
}

export async function uploadPhoto(file, animalId) {
  const user = auth.currentUser;
  if (!user) throw new Error("Not logged in");

  // 🔥 compress large images BEFORE upload (fix freeze)
  const compressed = await compressImage(file, { maxWidth: 1200, quality: 0.78 });

  const fileRef = ref(storage, `users/${user.uid}/animals/${animalId}/${Date.now()}-${compressed.name}`);

  await uploadBytes(fileRef, compressed);
  return await getDownloadURL(fileRef);
}
