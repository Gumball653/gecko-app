export function deleteHousingLocationById(locations, locationId) {
  return locations.filter((loc) => loc.id !== locationId);
}

export function clearHousingLocationFromAnimals(animals, locationId) {
  return animals.map((animal) =>
    animal?.housing?.locationId === locationId
      ? {
          ...animal,
          housing: {
            ...animal.housing,
            locationId: "",
          },
        }
      : animal
  );
}
