// API Functions

// 1. Routing (OSRM)
export const fetchRoutePolyline = async (points) => {
  try {
    const coordsString = points.map(p => `${p[1]},${p[0]}`).join(';');
    const url = `https://router.project-osrm.org/route/v1/driving/${coordsString}?overview=full&geometries=geojson&steps=true`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.code === 'Ok' && data.routes.length > 0) {
      const route = data.routes[0];
      const coordinates = route.geometry.coordinates.map(coord => [coord[1], coord[0]]);
      
      const maneuvers = route.legs.flatMap(leg => leg.steps.map(step => ({
        instruction: step.maneuver.type === 'arrive' ? 'Ziel erreicht' : (step.name || 'Straße folgen'),
        type: step.maneuver.modifier || step.maneuver.type,
        location: [step.maneuver.location[1], step.maneuver.location[0]],
        distance: step.distance
      })));

      return {
        coordinates,
        distance: route.distance / 1000,
        duration: route.duration / 60,
        maneuvers
      };
    }
    return null;
  } catch (error) {
    console.warn("Routing failed", error);
    return null;
  }
};

// 2. POIs (Overpass API - Robust Version)
export const fetchPOIsOverpass = async (bounds) => {
  try {
    const bbox = `${bounds.getSouth()},${bounds.getWest()},${bounds.getNorth()},${bounds.getEast()}`;
    
    // Using 'nwr' (node, way, relation) and 'out center' handles buildings correctly!
    const query = `
      [out:json][timeout:25];
      (
        nwr["amenity"="charging_station"](${bbox});
        nwr["amenity"="fuel"](${bbox});
        nwr["shop"="supermarket"](${bbox});
        nwr["amenity"="fast_food"](${bbox});
        nwr["amenity"="school"](${bbox});
      );
      out center;
    `;

    const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;
    const response = await fetch(url);
    const data = await response.json();

    return data.elements.map(el => ({
      id: el.id,
      lat: el.center ? el.center.lat : el.lat,
      lon: el.center ? el.center.lon : el.lon,
      type: el.tags.amenity || el.tags.shop, 
      name: el.tags.name || (el.tags.amenity === 'charging_station' ? 'Ladesäule' : 'Unbekannt')
    })).filter(poi => poi.lat && poi.lon); 
  } catch (e) {
    console.warn("Overpass API failed", e);
    return []; 
  }
};

