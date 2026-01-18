import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  BatteryCharging, Fuel, Navigation, Search, 
  X, Crosshair, Zap, Plus, 
  Heart, Loader2
} from 'lucide-react';
import { SCOOTER_PRESETS, DEFAULT_START_LOCATION } from './config';
import { isValidCoords, getBearing } from './utils/helpers';
import { fetchRoutePolyline, fetchPOIsOverpass } from './utils/api';
import InstructionIcon from './components/InstructionIcon';
import VehicleProfileSettings from './components/VehicleProfileSettings';
import './styles.css';

export default function ScootNavOS() {
  const [viewState, setViewState] = useState('idle');
  const [vehicle, setVehicle] = useState({ ...SCOOTER_PRESETS[0], level: 85 });
  
  // Locations
  const [userLocation, setUserLocation] = useState(DEFAULT_START_LOCATION);
  const [startPoint, setStartPoint] = useState(null); 
  const [destination, setDestination] = useState(null);
  const [stops, setStops] = useState([]); 
  const [gpsLocked, setGpsLocked] = useState(false);
  const [hasInitialCentered, setHasInitialCentered] = useState(false); 
  const [favorites, setFavorites] = useState([]); 
  
  // Data
  const [routeInfo, setRouteInfo] = useState(null);
  const [poiCache, setPoiCache] = useState({}); // Cache POIs by ID
  const [navInstruction, setNavInstruction] = useState(null);
  const [mapBearing, setMapBearing] = useState(0);

  // UI
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeSearchField, setActiveSearchField] = useState('dest'); 
  const [showProfile, setShowProfile] = useState(false);
  const [showPOIs, setShowPOIs] = useState(true);
  const [scenicMode, setScenicMode] = useState(false);
  const [isLoadingPOIs, setIsLoadingPOIs] = useState(false);
  
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const routeLayerRef = useRef(null);
  const userMarkerRef = useRef(null);
  const simIntervalRef = useRef(null);
  const navPathRef = useRef([]);
  const watchIdRef = useRef(null);
  const poiUpdateTimeoutRef = useRef(null);
  const lastPoiBoundsRef = useRef(null);
  const showPOIsRef = useRef(showPOIs);
  
  // Keep showPOIs ref in sync
  useEffect(() => {
    showPOIsRef.current = showPOIs;
  }, [showPOIs]);

  // Define updatePOIs before it's used
  const updatePOIs = useCallback(async (bounds) => {
      if (!bounds) return;
      setIsLoadingPOIs(true);
      try {
        const newPois = await fetchPOIsOverpass(bounds);
        
        setPoiCache(prevCache => {
            const nextCache = { ...prevCache };
            newPois.forEach(poi => {
                nextCache[poi.id] = poi; // Merge new POIs into cache
            });
            return nextCache;
        });
      } catch (error) {
        console.warn("POI update failed", error);
      } finally {
        setIsLoadingPOIs(false);
      }
  }, []);

  // Init Map
  useEffect(() => {
    const link = document.createElement('link'); 
    link.rel = 'stylesheet'; 
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'; 
    document.head.appendChild(link);
    
    const script = document.createElement('script'); 
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'; 
    script.async = true;
    script.onload = () => {
       if (mapContainerRef.current && !mapInstanceRef.current && window.L) {
         const map = window.L.map(mapContainerRef.current, { zoomControl: false, attributionControl: false }).setView(DEFAULT_START_LOCATION, 15);
         window.L.tileLayer('https://cartodb-basemaps-{s}.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png', { maxZoom: 20 }).addTo(map);
         
         const pulseIcon = window.L.divIcon({ className: 'user-marker', html: '<div class="pulse-ring"></div><div class="user-dot"></div>', iconSize: [24,24], iconAnchor: [12,12] });
         userMarkerRef.current = window.L.marker(DEFAULT_START_LOCATION, { icon: pulseIcon, zIndexOffset: 1000 }).addTo(map);
         mapInstanceRef.current = map;

         // Debounced POI update on map move
         map.on('moveend', () => {
            if (showPOIsRef.current && poiUpdateTimeoutRef.current === null) {
              poiUpdateTimeoutRef.current = setTimeout(() => {
                const bounds = map.getBounds();
                const boundsStr = `${bounds.getSouth()}-${bounds.getNorth()}-${bounds.getWest()}-${bounds.getEast()}`;
                // Only update if bounds changed significantly
                if (!lastPoiBoundsRef.current || lastPoiBoundsRef.current !== boundsStr) {
                  lastPoiBoundsRef.current = boundsStr;
                  updatePOIs(bounds);
                }
                poiUpdateTimeoutRef.current = null;
              }, 500); // Debounce POI updates
            }
         });
       }
    };
    document.body.appendChild(script);
    
    return () => {
      if (poiUpdateTimeoutRef.current) {
        clearTimeout(poiUpdateTimeoutRef.current);
      }
    };
  }, [updatePOIs]);

  // GPS with instant center - only set up once
  useEffect(() => {
    if ("geolocation" in navigator && !watchIdRef.current) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          if (isValidCoords([latitude, longitude])) {
            const newLocation = [latitude, longitude];
            setUserLocation(newLocation);
            setGpsLocked(true);
            
            // Always update marker position
            if (userMarkerRef.current) {
              userMarkerRef.current.setLatLng(newLocation);
            }

            // Force center on first lock
            if (!hasInitialCentered && mapInstanceRef.current) {
              mapInstanceRef.current.setView(newLocation, 16);
              setHasInitialCentered(true);
              // Fetch initial POIs around user
              if (showPOIs && mapInstanceRef.current) {
                setTimeout(() => {
                  updatePOIs(mapInstanceRef.current.getBounds());
                }, 1000);
              }
            }
          }
        },
        (error) => {
          console.warn("Geolocation error:", error);
          setGpsLocked(false);
        },
        { 
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 5000
        }
      );
    }
    
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, []); // Only run once on mount

  // Robust Search
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.length > 2) {
        setIsSearching(true);
        let results = [];
        
        try {
            let viewboxParam = "";
            if (mapInstanceRef.current) {
               const b = mapInstanceRef.current.getBounds();
               viewboxParam = `&viewbox=${b.getWest()},${b.getNorth()},${b.getEast()},${b.getSouth()}`;
            }
            const resLocal = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&addressdetails=1&limit=5&accept-language=de${viewboxParam}`);
            results = await resLocal.json();
        } catch(e) {}

        if (results.length === 0) {
            try {
                const resGlobal = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&addressdetails=1&limit=5&accept-language=de&countrycodes=de`);
                const dataGlobal = await resGlobal.json();
                results = [...dataGlobal];
            } catch(e) {}
        }
        
        setSearchResults(results.map(i => ({ 
          id: i.place_id, name: i.name || i.display_name.split(',')[0], 
          coords: [parseFloat(i.lat), parseFloat(i.lon)], category: i.type,
          full_name: i.display_name 
        })));
        setIsSearching(false);
      } else {
        setSearchResults([]);
        setIsSearching(false);
      }
    }, 400); 
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectLocation = (item) => {
    const loc = { ...item, name: item.name };
    if (activeSearchField === 'dest') setDestination(loc);
    if (activeSearchField === 'start') setStartPoint(loc);
    if (activeSearchField === 'stop') setStops([...stops, loc]);
    
    setSearchQuery("");
    setSearchResults([]);
    
    if (mapInstanceRef.current) {
        mapInstanceRef.current.flyTo(item.coords, 16);
    }
  };

  const locateUser = () => {
    if (mapInstanceRef.current && isValidCoords(userLocation)) {
      mapInstanceRef.current.flyTo(userLocation, 16, { duration: 1.2 });
    }
  };

  const toggleFavorite = (loc) => {
    if (!loc) return;
    const exists = favorites.find(f => f.name === loc.name);
    if (exists) {
       setFavorites(favorites.filter(f => f.name !== loc.name));
    } else {
       setFavorites([...favorites, { ...loc, type: 'favorite' }]);
    }
  };

  const isFavorite = (loc) => {
    if (!loc) return false;
    return favorites.some(f => f.name === loc.name);
  };

  // Route Calculation - optimized to prevent unnecessary recalculations
  useEffect(() => {
    if (!destination) {
      if (routeLayerRef.current && mapInstanceRef.current) {
        mapInstanceRef.current.removeLayer(routeLayerRef.current);
        routeLayerRef.current = null;
      }
      setRouteInfo(null);
      return;
    }

    const calcRoute = async () => {
       const start = startPoint ? startPoint.coords : userLocation;
       if (destination && isValidCoords(start)) {
          const points = [start, ...stops.map(s => s.coords), destination.coords];
          
          const info = await fetchRoutePolyline(points);
          if (info && mapInstanceRef.current && window.L) {
             if (routeLayerRef.current) {
               mapInstanceRef.current.removeLayer(routeLayerRef.current);
             }
             
             const polyline = window.L.polyline(info.coordinates, { 
               color: '#3b82f6', weight: 8, opacity: 0.8, lineJoin: 'round' 
             }).addTo(mapInstanceRef.current);
             
             routeLayerRef.current = polyline;
             navPathRef.current = info.coordinates; 
             
             mapInstanceRef.current.flyToBounds(polyline.getBounds(), { padding: [50, 50] });

             const usage = (info.distance / 100) * vehicle.consumption / vehicle.capacity * 100;
             setRouteInfo({ ...info, usageCost: Math.round(usage) });
             setViewState('planning');
          }
       }
    };
    
    // Debounce route calculation slightly to avoid rapid recalculations
    const timeoutId = setTimeout(calcRoute, 300);
    return () => clearTimeout(timeoutId);
  }, [destination, startPoint, stops, vehicle.consumption, vehicle.capacity, userLocation]);

  // Draw POIs from Cache - optimized to only update changed markers
  useEffect(() => {
     if (!mapInstanceRef.current || !window.L) return;
     
     if (!showPOIs) {
        markersRef.current.forEach(m => {
          if (mapInstanceRef.current.hasLayer(m)) {
            mapInstanceRef.current.removeLayer(m);
          }
        });
        markersRef.current = [];
        return;
     }
     
     // Create a map of existing marker IDs for quick lookup
     const existingMarkerIds = new Set(markersRef.current.map(m => m.options.poiId));
     const poiIds = new Set(Object.keys(poiCache));
     
     // Remove markers that are no longer in cache
     markersRef.current = markersRef.current.filter(m => {
       if (!poiIds.has(String(m.options.poiId))) {
         if (mapInstanceRef.current.hasLayer(m)) {
           mapInstanceRef.current.removeLayer(m);
         }
         return false;
       }
       return true;
     });
     
     // Add new markers only for POIs not already displayed
     Object.values(poiCache).forEach(poi => {
       if (!existingMarkerIds.has(String(poi.id))) {
         let color = '#ffffff';
         let iconSize = 10;
         let zIndex = 100;
         
         if (poi.type === 'fuel') { color = '#f59e0b'; iconSize=12; }
         else if (poi.type === 'fast_food' || poi.type === 'restaurant') { color = '#ef4444'; iconSize=12; }
         else if (poi.type === 'charging_station') { color = '#a855f7'; iconSize=20; zIndex=200; } 
         else if (poi.type === 'supermarket' || poi.type === 'convenience') { color = '#3b82f6'; iconSize=12; }
         else if (poi.type === 'school' || poi.type === 'college') { color = '#10b981'; iconSize=14; }
         
         let iconSvg = '';
         if (poi.type === 'charging_station') iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}" stroke="white" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>`;
         else iconSvg = `<div style="background:${color};width:${iconSize}px;height:${iconSize}px;border-radius:50%;border:2px solid white;box-shadow:0 0 10px ${color}"></div>`;

         const icon = window.L.divIcon({
            className: 'poi-marker',
            html: iconSvg,
            iconSize: [iconSize, iconSize],
            iconAnchor: [iconSize/2, iconSize/2]
         });
         const m = window.L.marker([poi.lat, poi.lon], { 
           icon, 
           zIndexOffset: zIndex,
           poiId: poi.id 
         })
           .bindPopup(poi.name)
           .on('click', () => setDestination({name: poi.name, coords: [poi.lat, poi.lon], category: poi.type}))
           .addTo(mapInstanceRef.current);
         markersRef.current.push(m);
       }
     });
  }, [poiCache, showPOIs]);

  // Navigation Logic
  const startNavigation = () => {
    if (!navPathRef.current || navPathRef.current.length === 0) {
        if (routeInfo && routeInfo.coordinates) {
            navPathRef.current = routeInfo.coordinates;
        } else {
            console.error("No navigation path available");
            return;
        }
    }

    setViewState('navigating');

    let idx = 0;
    const path = navPathRef.current;
    
    if (simIntervalRef.current) clearInterval(simIntervalRef.current);
    
    simIntervalRef.current = setInterval(() => {
      if (idx >= path.length - 1) { clearInterval(simIntervalRef.current); return; }

      const curr = path[idx];
      const next = path[idx + 1];
      
      if (userMarkerRef.current) userMarkerRef.current.setLatLng(curr);

      const bearing = getBearing(curr[0], curr[1], next[0], next[1]);
      setMapBearing(bearing);

      if (routeInfo && routeInfo.maneuvers) {
         const nextManeuver = routeInfo.maneuvers.find(m => {
            const d = Math.abs(m.location[0] - curr[0]) + Math.abs(m.location[1] - curr[1]);
            return d < 0.002;
         });
         if (nextManeuver) setNavInstruction(nextManeuver);
      }

      let zoom = 17;
      if (idx + 3 < path.length) {
         const futureBearing = getBearing(path[idx+2][0], path[idx+2][1], path[idx+3][0], path[idx+3][1]);
         if (Math.abs(bearing - futureBearing) > 20) zoom = 19;
      }

      if (mapInstanceRef.current) {
         const mapPane = mapInstanceRef.current.getPane('mapPane');
         if (mapPane) {
            mapPane.style.transformOrigin = `${mapInstanceRef.current.getSize().x/2}px ${mapInstanceRef.current.getSize().y/2}px`;
         }
         mapInstanceRef.current.setView(curr, zoom, { animate: true, duration: 0.1 });
      }
      
      idx++;
    }, 100);
  };

  const cancelNav = () => {
    setViewState('idle');
    setMapBearing(0);
    clearInterval(simIntervalRef.current);
    if (mapInstanceRef.current) mapInstanceRef.current.flyTo(userLocation, 15);
  };

  const levelColor = vehicle.level < 20 ? 'text-red-400' : (vehicle.type === 'electric' ? 'text-green-400' : 'text-amber-400');
  const LevelIcon = vehicle.type === 'electric' ? BatteryCharging : Fuel;

  return (
    <div className="relative w-full h-screen bg-[#0a0a0a] overflow-hidden font-sans text-white">
      {/* Map */}
      <div 
        className={`absolute inset-0 z-0 ${viewState === 'navigating' ? 'rotated-map-container' : ''}`}
        style={viewState === 'navigating' ? { transform: `rotate(${-mapBearing}deg)` } : {}}
      >
         <div ref={mapContainerRef} className="w-full h-full bg-[#121212]" />
      </div>
      
      {/* --- UI LAYER --- */}
      <div className="absolute inset-0 z-10 pointer-events-none">
         
         {/* Top Bar */}
         <div className={`pointer-events-auto absolute top-0 left-0 right-0 p-4 transition-transform duration-500 ${viewState === 'navigating' ? '-translate-y-64' : ''}`}>
            
            {/* Search Input Only */}
            <div className="glass-panel rounded-[32px] p-1 flex items-center pr-2">
               <div className="flex-1 flex items-center px-4 gap-3 h-12">
                  <Search className={`transition-colors ${isSearching ? 'text-blue-400 animate-pulse' : 'text-white/50'}`} size={20} />
                  <input 
                    className="bg-transparent w-full outline-none text-lg font-light tracking-wide placeholder-white/50"
                    placeholder="Wohin geht's? (z.B. Schule, Lidl)"
                    value={activeSearchField === 'dest' ? searchQuery : (destination ? destination.name : "")}
                    onFocus={() => { setActiveSearchField('dest'); setSearchQuery(''); }}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                  {isSearching && <Loader2 className="animate-spin text-white/30" size={16}/>}
                  {activeSearchField !== 'stop' && destination && (
                     <button onClick={() => { setActiveSearchField('stop'); setSearchQuery(''); }} className="p-2 bg-white/5 rounded-full"><Plus size={16}/></button>
                  )}
               </div>
               {/* Profile Button */}
               <button onClick={() => setShowProfile(true)} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                  <LevelIcon size={18} className={levelColor}/>
               </button>
            </div>

            {/* Suggestions */}
            {searchResults.length > 0 && (
              <div className="glass-panel mt-2 rounded-[24px] overflow-hidden max-h-60 overflow-y-auto shadow-2xl">
                 {searchResults.map(item => (
                    <button key={item.id} onClick={() => handleSelectLocation(item)} className="w-full text-left p-4 hover:bg-white/10 border-b border-white/5 last:border-0">
                       <div className="font-medium text-sm">{item.name}</div>
                       <div className="text-xs text-white/50 truncate pr-4">{item.full_name}</div>
                    </button>
                 ))}
              </div>
            )}
            
            {/* Toggles & Favorites */}
            <div className="flex gap-2 mt-4 overflow-x-auto no-scrollbar mask-gradient">
               <button onClick={() => setScenicMode(!scenicMode)} className={`px-5 py-3 rounded-full text-sm font-medium border whitespace-nowrap transition-colors ${scenicMode ? 'bg-green-500/20 border-green-500 text-green-400' : 'glass-panel border-transparent'}`}>
                  🌳 Schöne Strecke
               </button>
               <button onClick={() => {
                   const nextState = !showPOIs;
                   setShowPOIs(nextState);
               }} className={`px-5 py-3 rounded-full text-sm font-medium border whitespace-nowrap transition-colors flex items-center gap-2 ${showPOIs ? 'bg-purple-500/20 border-purple-500 text-purple-400' : 'glass-panel border-transparent'}`}>
                  {isLoadingPOIs ? <Loader2 className="animate-spin" size={14}/> : '⚡️'} POIs & Lader
               </button>

               {favorites.map((loc, i) => (
                  <button key={i} onClick={() => setDestination(loc)} className="glass-panel px-5 py-3 rounded-full text-sm flex items-center gap-2 whitespace-nowrap active:scale-95 transition-transform">
                     <Heart size={14} className="text-pink-400 fill-pink-400" /> {loc.name}
                  </button>
               ))}
            </div>
         </div>

         {/* Floating Location Button */}
         {viewState === 'idle' && !destination && (
            <button 
               onClick={locateUser}
               className={`pointer-events-auto absolute bottom-32 right-6 w-14 h-14 glass-panel rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-transform z-10 ${gpsLocked ? 'text-blue-400' : 'text-white/40'}`}
            >
               <Crosshair size={24} />
            </button>
         )}

         {/* Planning Sheet */}
         <div className={`pointer-events-auto absolute bottom-0 left-0 right-0 p-4 transition-transform duration-500 ${viewState === 'planning' ? 'translate-y-0' : 'translate-y-full'}`}>
             <div className="glass-panel rounded-[40px] p-6 shadow-2xl">
                 {routeInfo && (
                   <>
                     <div className="flex justify-between items-start mb-6">
                        <div>
                          <div className="flex items-center gap-3">
                             <h2 className="text-4xl font-thin tracking-tighter">{routeInfo.duration.toFixed(0)} <span className="text-lg font-normal text-white/50">min</span></h2>
                             <button 
                               onClick={() => toggleFavorite(destination)}
                               className={`p-2 rounded-full transition-colors ${isFavorite(destination) ? 'bg-pink-500/20 text-pink-400' : 'bg-white/5 text-white/40'}`}
                             >
                                <Heart size={20} fill={isFavorite(destination) ? "currentColor" : "none"} />
                             </button>
                          </div>
                          <div className="text-white/60 mt-1">{routeInfo.distance.toFixed(1)} km • {destination?.name}</div>
                        </div>
                        <button onClick={() => {setDestination(null); setViewState('idle');}} className="p-3 bg-white/5 rounded-full"><X/></button>
                     </div>
                     
                     <div className="flex gap-3 mb-6">
                        <div className={`flex-1 p-4 rounded-3xl border ${routeInfo.usageCost > vehicle.level ? 'border-red-500 bg-red-500/10' : 'border-green-500/20 bg-green-500/10'}`}>
                           <div className="text-xs uppercase tracking-widest opacity-60">Verbrauch</div>
                           <div className={`text-2xl font-bold mt-1 ${routeInfo.usageCost > vehicle.level ? 'text-red-500' : 'text-green-500'}`}>{routeInfo.usageCost}%</div>
                        </div>
                        <div className="flex-1 p-4 rounded-3xl border border-white/10 bg-white/5">
                           <div className="text-xs uppercase tracking-widest opacity-60">Stau</div>
                           <div className="text-2xl font-bold text-white mt-1">Gering</div>
                        </div>
                     </div>

                     <button onClick={startNavigation} className="w-full py-5 bg-white text-black rounded-[24px] font-bold text-lg hover:scale-[1.02] transition-transform flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(255,255,255,0.2)]">
                        <Navigation fill="black" /> Navigation Starten
                     </button>
                   </>
                 )}
             </div>
         </div>

         {/* Navigation Overlay */}
         <div className={`absolute top-0 left-0 right-0 p-6 transition-transform duration-500 ${viewState === 'navigating' ? 'translate-y-0' : '-translate-y-48'}`}>
            <div className="glass-panel rounded-[32px] p-6 flex gap-6 items-center shadow-lg border-t-2 border-t-blue-500">
               <div className="bg-blue-500 rounded-2xl p-4 shadow-[0_0_30px_rgba(59,130,246,0.5)]">
                  <InstructionIcon type={navInstruction?.type} />
               </div>
               <div className="flex-1">
                  <div className="text-5xl font-bold font-mono tracking-tighter">
                     {navInstruction ? Math.max(0, Math.round(navInstruction.distance * 1000)) : 0} <span className="text-xl text-white/50 font-sans">m</span>
                  </div>
                  <div className="text-xl leading-tight text-blue-200 mt-2 font-light">
                     {navInstruction?.instruction || "Route berechnen..."}
                  </div>
               </div>
            </div>
         </div>

         <div className={`pointer-events-auto absolute bottom-8 left-8 right-8 flex items-end justify-between transition-opacity duration-500 ${viewState === 'navigating' ? 'opacity-100' : 'opacity-0'}`}>
            <div className="glass-panel px-6 py-4 rounded-[24px]">
               <div className="text-xs uppercase text-white/50 font-bold tracking-widest">Ankunft</div>
               <div className="text-3xl font-mono font-medium text-green-400 mt-1">
                  {routeInfo && new Date(Date.now() + routeInfo.duration*60000).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
               </div>
            </div>
            <button onClick={cancelNav} className="w-20 h-20 rounded-full bg-red-500/20 border border-red-500/50 text-red-500 flex items-center justify-center font-bold tracking-widest text-xs active:scale-95 transition-transform backdrop-blur-md">
               ENDE
            </button>
         </div>

      </div>

      {showProfile && <VehicleProfileSettings vehicleState={vehicle} updateVehicle={setVehicle} close={() => setShowProfile(false)} />}
    </div>
  );
}

