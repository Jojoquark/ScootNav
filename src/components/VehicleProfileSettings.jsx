import { X, Zap, Fuel } from 'lucide-react';
import { SCOOTER_PRESETS } from '../config';

const VehicleProfileSettings = ({ vehicleState, updateVehicle, close }) => {
  const calculatedRange = vehicleState.consumption > 0 
    ? Math.round((vehicleState.capacity / vehicleState.consumption) * 100) 
    : 0;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto">
       <div className="w-full max-w-sm glass-panel rounded-[40px] p-8 text-white max-h-full overflow-y-auto no-scrollbar">
          <div className="flex justify-between items-center mb-6">
             <h2 className="text-2xl font-thin">Fahrzeug</h2>
             <button onClick={close} className="p-2 hover:bg-white/10 rounded-full"><X /></button>
          </div>
          
          <div className="mb-8 space-y-6">
             <div className="bg-white/5 rounded-3xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                   <span className="text-sm opacity-60">Antrieb</span>
                   <div className="flex bg-black/40 rounded-lg p-1">
                      <button 
                        onClick={() => updateVehicle({ ...vehicleState, type: 'electric' })}
                        className={`p-2 rounded-md transition-colors ${vehicleState.type === 'electric' ? 'bg-white/20 text-green-400' : 'text-white/30'}`}
                      ><Zap size={16}/></button>
                      <button 
                        onClick={() => updateVehicle({ ...vehicleState, type: 'petrol' })}
                        className={`p-2 rounded-md transition-colors ${vehicleState.type === 'petrol' ? 'bg-white/20 text-amber-400' : 'text-white/30'}`}
                      ><Fuel size={16}/></button>
                   </div>
                </div>

                <div>
                   <div className="flex justify-between text-sm mb-2">
                      <span className="opacity-60">Kapazität ({vehicleState.type === 'electric' ? 'kWh' : 'L'})</span>
                      <input 
                         type="number" 
                         value={vehicleState.capacity} 
                         onChange={(e) => updateVehicle({...vehicleState, capacity: parseFloat(e.target.value) || 0})}
                         className="w-16 bg-transparent text-right outline-none font-bold border-b border-white/20 focus:border-blue-500"
                      />
                   </div>
                   <input 
                      type="range" min="0.1" max="15" step="0.1"
                      value={vehicleState.capacity}
                      onChange={(e) => updateVehicle({...vehicleState, capacity: parseFloat(e.target.value)})}
                      className="w-full h-1 bg-white/20 rounded-full appearance-none cursor-pointer"
                   />
                </div>

                <div>
                   <div className="flex justify-between text-sm mb-2">
                      <span className="opacity-60">Verbrauch / 100km</span>
                      <input 
                         type="number" 
                         value={vehicleState.consumption} 
                         onChange={(e) => updateVehicle({...vehicleState, consumption: parseFloat(e.target.value) || 0})}
                         className="w-16 bg-transparent text-right outline-none font-bold border-b border-white/20 focus:border-blue-500"
                      />
                   </div>
                   <input 
                      type="range" min="1.0" max="8.0" step="0.1"
                      value={vehicleState.consumption}
                      onChange={(e) => updateVehicle({...vehicleState, consumption: parseFloat(e.target.value)})}
                      className="w-full h-1 bg-white/20 rounded-full appearance-none cursor-pointer"
                   />
                </div>

                <div className="pt-2 border-t border-white/10 flex justify-between items-center">
                   <span className="text-xs opacity-40 uppercase tracking-widest">Reichweite</span>
                   <span className="font-mono text-xl">{calculatedRange} km</span>
                </div>
             </div>
          </div>

          <div className="text-xs uppercase tracking-widest opacity-40 mb-4">Oder Preset wählen</div>
          
          <div className="space-y-3">
             {SCOOTER_PRESETS.map(p => (
               <button key={p.id} onClick={() => updateVehicle({ ...p, level: vehicleState.level })} className={`w-full p-4 rounded-2xl text-left border transition-all ${vehicleState.id === p.id ? 'border-blue-500 bg-blue-500/20' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}>
                 <div className="font-bold tracking-wide">{p.name}</div>
                 <div className="text-xs text-white/50 flex items-center gap-2 mt-1">
                    {p.type === 'electric' ? <Zap size={12}/> : <Fuel size={12}/>} 
                    {p.type === 'electric' ? 'Elektro' : 'Benzin'} • {p.consumption} Verbrauch
                 </div>
               </button>
             ))}
          </div>
       </div>
    </div>
  );
};

export default VehicleProfileSettings;

