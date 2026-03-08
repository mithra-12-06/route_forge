import React, { useState, useEffect, useMemo } from 'react';
import { 
  Bus, 
  MapPin, 
  Users, 
  QrCode, 
  AlertTriangle, 
  Navigation, 
  ChevronRight, 
  Clock,
  Search,
  Settings,
  Bell,
  Info,
  LogOut,
  LayoutDashboard,
  Route as RouteIcon,
  Shield,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  XCircle,
  Map as MapIcon
} from 'lucide-react';
import { motion, AnimatePresence, useMotionValue, useSpring, useMotionValueEvent } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { 
  APIProvider, 
  Map, 
  AdvancedMarker, 
  Pin,
  InfoWindow
} from '@vis.gl/react-google-maps';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Types
interface Route {
  id: number;
  name: string;
}

interface Stop {
  id: number;
  name: string;
  lat: number;
  lng: number;
}

interface BusData {
  id: number;
  bus_number: string;
  total_seats: number;
  current_passengers: number;
  current_route_id: number;
  lat: number;
  lng: number;
  status: 'active' | 'suspended';
}

interface User {
  id: number;
  name: string;
  role: 'student' | 'faculty' | 'admin';
  assigned_route_id: number | null;
}

// Components
const OccupancyRing = ({ current, total }: { current: number; total: number }) => {
  const percentage = Math.min(100, (current / total) * 100);
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  const isFull = percentage >= 100;
  const isWarning = percentage >= 80;

  return (
    <div className="relative w-24 h-24 flex items-center justify-center">
      <svg className="w-full h-full -rotate-90 transform">
        <circle
          cx="48"
          cy="48"
          r={radius}
          stroke="currentColor"
          strokeWidth="6"
          fill="transparent"
          className="text-slate-100/50"
        />
        <motion.circle
          cx="48"
          cy="48"
          r={radius}
          stroke="currentColor"
          strokeWidth="6"
          fill="transparent"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className={cn(
            "transition-colors duration-500",
            isFull ? "text-rose-500" : isWarning ? "text-amber-500" : "text-indigo-600"
          )}
          strokeLinecap="round"
          style={{
            filter: isFull 
              ? 'drop-shadow(0 0 8px rgba(244, 63, 94, 0.6))' 
              : isWarning 
                ? 'drop-shadow(0 0 8px rgba(245, 158, 11, 0.6))'
                : 'drop-shadow(0 0 8px rgba(79, 70, 229, 0.6))'
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span 
          key={current}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-lg font-black text-slate-900 leading-none"
        >
          {Math.round(percentage)}%
        </motion.span>
        <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter mt-1">Full</span>
      </div>
      {/* Neon Glow Effect */}
      <div className={cn(
        "absolute inset-0 rounded-full blur-xl opacity-20 transition-colors duration-500",
        isFull ? "bg-rose-500" : isWarning ? "bg-amber-500" : "bg-indigo-600"
      )} />
    </div>
  );
};

const GlassCard = ({ children, className, neonColor = "indigo", ...props }: { children: React.ReactNode; className?: string; neonColor?: "indigo" | "emerald" | "rose" | "amber" | "peacock"; [key: string]: any }) => {
  const neonStyles = {
    indigo: "hover:shadow-[0_0_40px_rgba(79,70,229,0.15)] border-indigo-500/10",
    emerald: "hover:shadow-[0_0_40px_rgba(16,185,129,0.15)] border-emerald-500/10",
    rose: "hover:shadow-[0_0_40_rgba(244,63,94,0.15)] border-rose-500/10",
    amber: "hover:shadow-[0_0_40px_rgba(245,158,11,0.15)] border-amber-500/10",
    peacock: "hover:shadow-[0_0_40px_rgba(0,95,115,0.2)] border-peacock/20",
  };

  return (
    <motion.div
      {...props}
      whileHover={{ y: -5 }}
      className={cn(
        "bg-white/70 backdrop-blur-xl border rounded-[48px] p-8 transition-all duration-500",
        neonStyles[neonColor],
        className
      )}
    >
      {children}
    </motion.div>
  );
};

const SeatMap = ({ bus, onClose }: { bus: BusData; onClose: () => void }) => {
  const rows = Math.ceil(bus.total_seats / 5);
  const occupiedSeats = useMemo(() => {
    const set = new Set<number>();
    while (set.size < bus.current_passengers) {
      set.add(Math.floor(Math.random() * bus.total_seats));
    }
    return set;
  }, [bus.id, bus.current_passengers, bus.total_seats]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-peacock-dark/80 backdrop-blur-md"
    >
      <GlassCard neonColor="peacock" className="w-full max-w-2xl bg-white/90 overflow-hidden relative">
        <button 
          onClick={onClose}
          className="absolute top-8 right-8 w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-rose-500 hover:text-white transition-all z-10"
        >
          <XCircle size={24} />
        </button>

        <div className="mb-8">
          <h3 className="text-3xl font-black text-peacock-dark tracking-tighter">Bus {bus.bus_number}</h3>
          <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Seat Availability Checker</p>
        </div>

        <div className="flex gap-8 mb-10">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-slate-200" />
            <span className="text-[10px] font-black uppercase text-slate-400">Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-peacock" />
            <span className="text-[10px] font-black uppercase text-slate-400">Occupied</span>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <Users size={14} className="text-peacock" />
            <span className="text-sm font-black text-peacock-dark">{bus.current_passengers} / {bus.total_seats}</span>
          </div>
        </div>

        <div className="bg-slate-50 rounded-[32px] p-8 max-h-[50vh] overflow-y-auto custom-scrollbar">
          <div className="flex flex-col gap-4">
            {Array.from({ length: rows }).map((_, rowIndex) => (
              <div key={rowIndex} className="flex items-center justify-between gap-4">
                {/* Left 2 seats */}
                <div className="flex gap-2">
                  {[0, 1].map(colIndex => {
                    const seatIndex = rowIndex * 5 + colIndex;
                    if (seatIndex >= bus.total_seats) return <div key={colIndex} className="w-10 h-10" />;
                    const isOccupied = occupiedSeats.has(seatIndex);
                    return (
                      <motion.div
                        key={colIndex}
                        whileHover={{ scale: 1.1 }}
                        className={cn(
                          "w-10 h-10 rounded-xl border-2 flex items-center justify-center transition-all duration-300",
                          isOccupied 
                            ? "bg-peacock border-peacock text-white shadow-lg shadow-peacock/20" 
                            : "bg-white border-slate-200 text-slate-300"
                        )}
                      >
                        <span className="text-[10px] font-black">{seatIndex + 1}</span>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Aisle */}
                <div className="w-8 flex items-center justify-center">
                  <div className="h-full w-px bg-slate-200 border-dashed border-l" />
                </div>

                {/* Right 3 seats */}
                <div className="flex gap-2">
                  {[2, 3, 4].map(colIndex => {
                    const seatIndex = rowIndex * 5 + colIndex;
                    if (seatIndex >= bus.total_seats) return <div key={colIndex} className="w-10 h-10" />;
                    const isOccupied = occupiedSeats.has(seatIndex);
                    return (
                      <motion.div
                        key={colIndex}
                        whileHover={{ scale: 1.1 }}
                        className={cn(
                          "w-10 h-10 rounded-xl border-2 flex items-center justify-center transition-all duration-300",
                          isOccupied 
                            ? "bg-peacock border-peacock text-white shadow-lg shadow-peacock/20" 
                            : "bg-white border-slate-200 text-slate-300"
                        )}
                      >
                        <span className="text-[10px] font-black">{seatIndex + 1}</span>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 flex justify-center">
          <div className="w-32 h-2 bg-slate-200 rounded-full" />
        </div>
      </GlassCard>
    </motion.div>
  );
};

const useAnimatedPosition = (targetLat: number, targetLng: number) => {
  const lat = useMotionValue(targetLat);
  const lng = useMotionValue(targetLng);

  const springLat = useSpring(lat, { stiffness: 50, damping: 20 });
  const springLng = useSpring(lng, { stiffness: 50, damping: 20 });

  const [position, setPosition] = useState({ lat: targetLat, lng: targetLng });

  useEffect(() => {
    lat.set(targetLat);
    lng.set(targetLng);
  }, [targetLat, targetLng, lat, lng]);

  useMotionValueEvent(springLat, "change", (v) => {
    setPosition(prev => ({ ...prev, lat: v }));
  });

  useMotionValueEvent(springLng, "change", (v) => {
    setPosition(prev => ({ ...prev, lng: v }));
  });

  return position;
};

const AnimatedBusMarker = ({ bus, onClick }: { bus: BusData; onClick: () => void; key?: React.Key }) => {
  const position = useAnimatedPosition(bus.lat, bus.lng);

  return (
    <AdvancedMarker
      position={position}
      onClick={onClick}
    >
      <motion.div 
        layoutId={`bus-marker-${bus.id}`}
        className={cn(
          "w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-2xl border-2 border-white transition-all",
          bus.current_passengers >= bus.total_seats ? "bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.5)]" : "bg-peacock shadow-[0_0_15px_rgba(0,95,115,0.5)]"
        )}
      >
        <Bus size={20} />
      </motion.div>
    </AdvancedMarker>
  );
};

const BusInfoWindow = ({ bus, onClose }: { bus: BusData; onClose: () => void }) => {
  const position = useAnimatedPosition(bus.lat, bus.lng);
  
  return (
    <InfoWindow
      position={position}
      onCloseClick={onClose}
    >
      <div className="p-2 min-w-[120px]">
        <p className="font-black text-sm">{bus.bus_number}</p>
        <p className="text-[10px] font-bold text-slate-400">
          {bus.current_passengers} / {bus.total_seats} Seats
        </p>
      </div>
    </InfoWindow>
  );
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [buses, setBuses] = useState<BusData[]>([]);
  const [stops, setStops] = useState<Stop[]>([]);
  const [routeStops, setRouteStops] = useState<any[]>([]);
  const [predictions, setPredictions] = useState<any[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'admin'>('dashboard');
  const [adminSubTab, setAdminSubTab] = useState<'routes' | 'stops' | 'fleet' | 'logs'>('routes');
  const [showScanner, setShowScanner] = useState(false);
  const [logs, setLogs] = useState<any>({ boarding: [], campus: [] });
  const [showAdminLogs, setShowAdminLogs] = useState(false);
  const [selectedBusId, setSelectedBusId] = useState<number | null>(null);
  const [selectedBusForSeats, setSelectedBusForSeats] = useState<BusData | null>(null);

  // Admin Management State
  const [editingRoute, setEditingRoute] = useState<Route | null>(null);
  const [newRouteName, setNewRouteName] = useState('');
  const [newStop, setNewStop] = useState({ name: '', lat: 12.9716, lng: 77.5946 });
  const [selectedRouteForStops, setSelectedRouteForStops] = useState<number | null>(null);
  const [routeStopsToEdit, setRouteStopsToEdit] = useState<number[]>([]);

  // Simulation state
  const [userLocation] = useState({ lat: 12.9716, lng: 77.5946 });

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    let ws: WebSocket | null = null;

    const connect = () => {
      try {
        fetchInitData();
        ws = new WebSocket(`${protocol}//${window.location.host}`);
        
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'BUS_UPDATE') {
              setBuses(prev => prev.map(b => b.id === data.bus.id ? data.bus : b));
            }
          } catch (e) {
            console.error('Failed to parse WS message', e);
          }
        };

        ws.onclose = () => {
          setTimeout(connect, 5000);
        };
      } catch (e) {
        console.error('WebSocket connection failed', e);
      }
    };

    connect();
    return () => {
      if (ws) ws.close();
    };
  }, []);

  const fetchInitData = async () => {
    try {
      const res = await fetch('/api/init');
      if (!res.ok) throw new Error('Failed to fetch init data');
      const data = await res.json();
      setRoutes(data.routes || []);
      setBuses(data.buses || []);
      setStops(data.stops || []);
      setRouteStops(data.routeStops || []);
      setPredictions(data.predictions || []);
    } catch (e) {
      console.error('Error fetching init data:', e);
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/logs');
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (e) {
      console.error('Error fetching logs:', e);
    }
  };

  useEffect(() => {
    if (activeTab === 'admin' && adminSubTab === 'logs') {
      fetchLogs();
    }
  }, [activeTab, adminSubTab]);

  const handleLogin = (role: User['role']) => {
    const mockUser: User = {
      id: 1,
      name: role === 'admin' ? 'Charlie Admin' : role === 'faculty' ? 'Bob Faculty' : 'Alice Student',
      role,
      assigned_route_id: role === 'admin' ? null : role === 'faculty' ? 2 : 1
    };
    setUser(mockUser);
    setSelectedRoute(mockUser.assigned_route_id);
  };

  const handleLogout = () => {
    setUser(null);
    setSelectedRoute(null);
    setActiveTab('dashboard');
  };

  const filteredBuses = useMemo(() => {
    if (!user) return [];
    return buses.filter(b => {
      if (user.role === 'admin' && activeTab === 'admin') return true;
      if (b.status === 'suspended') return false;
      
      const isAssigned = b.current_route_id === selectedRoute;
      const isNearby = Math.sqrt(Math.pow(b.lat - userLocation.lat, 2) + Math.pow(b.lng - userLocation.lng, 2)) < 0.005;
      
      return isAssigned || isNearby;
    });
  }, [buses, selectedRoute, user, activeTab]);

  const alternatives = useMemo(() => {
    if (!selectedRoute) return [];
    return buses.filter(b => 
      b.current_route_id !== selectedRoute && 
      b.status === 'active' && 
      b.current_passengers < b.total_seats &&
      Math.sqrt(Math.pow(b.lat - userLocation.lat, 2) + Math.pow(b.lng - userLocation.lng, 2)) < 0.008
    ).slice(0, 3);
  }, [buses, selectedRoute]);

  const getCrowdLevel = (bus: BusData) => {
    const ratio = bus.current_passengers / bus.total_seats;
    if (ratio < 0.5) return { label: 'Low', color: 'text-peacock-light', bg: 'bg-peacock-light/10', border: 'border-peacock-light/20' };
    if (ratio < 0.9) return { label: 'Medium', color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-100' };
    return { label: 'High', color: 'text-rose-500', bg: 'bg-rose-50', border: 'border-rose-100' };
  };

  // Admin Actions
  const addRoute = async () => {
    if (!newRouteName) return;
    const res = await fetch('/api/admin/routes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newRouteName })
    });
    if (res.ok) {
      const data = await res.json();
      setRoutes([...routes, data]);
      setNewRouteName('');
    }
  };

  const deleteRoute = async (id: number) => {
    const res = await fetch(`/api/admin/routes/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setRoutes(routes.filter(r => r.id !== id));
    }
  };

  const addStop = async () => {
    if (!newStop.name) return;
    const res = await fetch('/api/admin/stops', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newStop)
    });
    if (res.ok) {
      const data = await res.json();
      setStops([...stops, data]);
      setNewStop({ name: '', lat: 12.9716, lng: 77.5946 });
    }
  };

  const deleteStop = async (id: number) => {
    const res = await fetch(`/api/admin/stops/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setStops(stops.filter(s => s.id !== id));
    }
  };

  const saveRouteStops = async () => {
    if (!selectedRouteForStops) return;
    const stopsPayload = routeStopsToEdit.map((stopId, index) => ({
      stopId,
      sequence: index + 1
    }));
    const res = await fetch('/api/admin/route-stops', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ routeId: selectedRouteForStops, stops: stopsPayload })
    });
    if (res.ok) {
      fetchInitData();
      setSelectedRouteForStops(null);
    }
  };

  const assignBusToRoute = async (busId: number, routeId: number) => {
    const res = await fetch('/api/admin/bus/assign-route', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ busId, routeId })
    });
    if (res.ok) {
      const updatedBus = await res.json();
      setBuses(prev => prev.map(b => b.id === busId ? updatedBus : b));
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-peacock-dark flex items-center justify-center p-6 overflow-hidden relative">
        {/* Animated Background Gradients */}
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-peacock/20 blur-[150px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-peacock-light/20 blur-[150px] rounded-full animate-pulse delay-700" />
        <div className="absolute top-[20%] right-[10%] w-[40%] h-[40%] bg-emerald-green/10 blur-[150px] rounded-full animate-pulse delay-1000" />

        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, ease: [0.23, 1, 0.32, 1] }}
          className="w-full max-w-2xl relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center"
        >
          <div className="text-left">
            <motion.div 
              initial={{ x: -50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="w-20 h-20 bg-peacock-light rounded-[28px] flex items-center justify-center text-peacock-dark shadow-[0_0_50px_rgba(10,147,150,0.4)] mb-8"
            >
              <Bus size={40} />
            </motion.div>
            <motion.h1 
              initial={{ x: -50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-7xl font-black text-white tracking-tighter mb-6 font-display leading-[0.9]"
            >
              Smart <br />
              <span className="text-peacock-light">Route</span> <br />
              Allocater
            </motion.h1>
            <motion.p 
              initial={{ x: -50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-slate-400 font-medium text-lg leading-relaxed max-w-xs"
            >
              Next-generation campus mobility with real-time tracking and smart seat allocation.
            </motion.p>
          </div>

          <GlassCard neonColor="peacock" className="p-12 bg-white/10 border-white/10 backdrop-blur-3xl shadow-2xl shadow-black/50">
            <div className="mb-10">
              <h2 className="text-3xl font-black text-white tracking-tight mb-2">Welcome Back</h2>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Select your role to continue</p>
            </div>
            
            <div className="space-y-4">
              {(['student', 'faculty', 'admin'] as const).map((role, i) => (
                <motion.button
                  key={role}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + i * 0.1 }}
                  onClick={() => handleLogin(role)}
                  className="w-full group flex items-center justify-between p-5 bg-white/5 hover:bg-peacock-light border border-white/10 hover:border-peacock-light rounded-[24px] transition-all duration-500"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-peacock-light group-hover:bg-peacock-dark group-hover:text-white transition-all duration-500">
                      {role === 'admin' ? <Shield size={24} /> : role === 'faculty' ? <Users size={24} /> : <Navigation size={24} />}
                    </div>
                    <div className="text-left">
                      <p className="text-white group-hover:text-peacock-dark font-black capitalize text-lg tracking-tight transition-colors">{role}</p>
                      <p className="text-slate-500 group-hover:text-peacock-dark/60 text-[10px] font-bold uppercase tracking-widest transition-colors">Dashboard</p>
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5 group-hover:bg-peacock-dark/20 transition-all duration-500">
                    <ChevronRight size={18} className="text-slate-600 group-hover:text-peacock-dark" />
                  </div>
                </motion.button>
              ))}
            </div>

            <div className="mt-10 pt-10 border-t border-white/5 flex items-center justify-between">
              <div className="flex -space-x-2">
                {[1,2,3].map(i => (
                  <div key={i} className="w-8 h-8 rounded-full border-2 border-peacock-dark bg-slate-800 flex items-center justify-center text-[10px] text-white font-bold">
                    {String.fromCharCode(64 + i)}
                  </div>
                ))}
              </div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                Trusted by 5,000+ Users
              </p>
            </div>
          </GlassCard>
        </motion.div>
      </div>
    );
  }

  return (
    <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''}>
      <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex font-sans">
        {/* Sidebar */}
        <aside className="w-80 bg-white border-r border-slate-200 flex flex-col sticky top-0 h-screen z-50 shadow-2xl shadow-slate-200/50">
          <div className="p-8">
            <div className="flex items-center gap-4 mb-12">
              <motion.div 
                whileHover={{ rotate: 10, scale: 1.1 }}
                className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200"
              >
                <Bus size={28} />
              </motion.div>
              <h1 className="font-black text-2xl tracking-tighter text-slate-900 font-display">RouteForge</h1>
            </div>

            <nav className="space-y-3">
              {[
                { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
                { id: 'admin', label: 'Admin Panel', icon: Shield, adminOnly: true },
                { id: 'schedules', label: 'Schedules', icon: Clock },
              ].map((item) => {
                if (item.adminOnly && user.role !== 'admin') return null;
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                
                return (
        <motion.button 
          key={item.id}
          whileHover={{ x: 5 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => item.id !== 'schedules' && setActiveTab(item.id as any)}
          className={cn(
            "w-full flex items-center gap-4 px-5 py-4 rounded-[20px] font-black text-sm transition-all relative overflow-hidden group",
            isActive 
              ? "bg-peacock text-white shadow-xl shadow-peacock/20" 
              : "text-slate-500 hover:bg-slate-50 hover:text-peacock"
          )}
        >
          <Icon size={22} className={cn("relative z-10", isActive ? "text-white" : "group-hover:text-peacock transition-colors")} />
          <span className="relative z-10">{item.label}</span>
          {isActive && (
            <motion.div 
              layoutId="activeNav"
              className="absolute inset-0 bg-gradient-to-r from-peacock to-peacock-light"
            />
          )}
        </motion.button>
                );
              })}
            </nav>
          </div>

          <div className="mt-auto p-8 border-t border-slate-100 bg-slate-50/30 backdrop-blur-sm">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-white border border-slate-200 rounded-2xl flex items-center justify-center text-indigo-600 font-black shadow-sm">
                {user.name.charAt(0)}
              </div>
              <div>
                <p className="font-black text-sm text-slate-900">{user.name}</p>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{user.role}</p>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 py-3 bg-white border border-rose-100 text-rose-600 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-rose-50 transition-all shadow-sm"
            >
              <LogOut size={16} />
              Sign Out
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col h-screen overflow-hidden">
          {/* Top Header */}
          <header className="bg-white/40 backdrop-blur-2xl border-b border-white/20 px-10 py-5 flex items-center justify-between sticky top-0 z-40">
            <div className="flex items-center gap-8">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight font-display flex items-center gap-3">
                {activeTab === 'dashboard' ? 'Live Tracking' : 'Management'}
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
              </h2>
              {activeTab === 'dashboard' && (
                <div className="flex gap-2 p-1 bg-slate-100/50 rounded-2xl border border-slate-200/50">
                  {routes.map(r => (
                    <button
                      key={r.id}
                      onClick={() => setSelectedRoute(r.id)}
                      className={cn(
                        "px-5 py-2 rounded-xl text-xs font-black transition-all uppercase tracking-widest",
                        selectedRoute === r.id ? "bg-white text-peacock shadow-md" : "text-slate-500 hover:text-peacock"
                      )}
                    >
                      {r.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-4">
              <div className="relative group">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                <input 
                  type="text" 
                  placeholder="Search buses..." 
                  className="pl-12 pr-4 py-3 bg-slate-100/50 border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-indigo-500/10 focus:bg-white transition-all w-72 border"
                />
              </div>
              <button className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-500 hover:text-indigo-600 hover:border-indigo-200 transition-all relative shadow-sm">
                <Bell size={20} />
                <span className="absolute top-3 right-3 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white"></span>
              </button>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-10 space-y-12 scrollbar-thin scrollbar-thumb-slate-200">
            {activeTab === 'dashboard' ? (
              <>
                {/* Stats Overview */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {[
                    { label: 'Active Buses', value: buses.filter(b => b.status === 'active').length, icon: Bus, color: 'text-peacock', bg: 'bg-peacock/5', border: 'border-peacock/10' },
                    { label: 'Avg. Occupancy', value: '64%', icon: Users, color: 'text-peacock-light', bg: 'bg-peacock-light/5', border: 'border-peacock-light/10' },
                    { label: 'Next Arrival', value: '8 min', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
                  ].map((stat, i) => (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      key={i} 
                      className="bg-white p-8 rounded-[40px] border border-slate-200 flex items-center gap-6 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all group"
                    >
                      <div className={cn("w-16 h-16 rounded-3xl flex items-center justify-center transition-transform group-hover:scale-110", stat.bg, stat.color, stat.border, "border")}>
                        <stat.icon size={32} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{stat.label}</p>
                        <p className="text-3xl font-black text-slate-900 font-display">{stat.value}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                  {/* Bus Grid */}
                  <div className="lg:col-span-2 space-y-8">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-black flex items-center gap-4 font-display">
                        Buses on {routes.find(r => r.id === selectedRoute)?.name || 'All Routes'}
                        <span className="px-3 py-1 bg-indigo-600 text-white text-[10px] font-black rounded-full uppercase tracking-widest animate-pulse">Live</span>
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <AnimatePresence mode="popLayout">
                        {filteredBuses.map(bus => {
                          const crowd = getCrowdLevel(bus);
                          const isFull = bus.current_passengers >= bus.total_seats;
                          const isAlternative = bus.current_route_id !== selectedRoute;

                          return (
                            <GlassCard
                              key={bus.id}
                              neonColor={isFull ? "rose" : "peacock"}
                              className={cn(
                                isAlternative && "border-dashed border-peacock-light/30 bg-peacock-light/5"
                              )}
                            >
                              {isAlternative && (
                                <div className="absolute top-6 right-6 px-3 py-1 bg-peacock-light text-peacock-dark text-[10px] font-black uppercase tracking-widest rounded-full shadow-[0_0_15px_rgba(10,147,150,0.4)]">
                                  Alternative
                                </div>
                              )}

                              <div className="flex items-start justify-between mb-8">
                                <div className="flex items-start gap-6">
                                  <div className={cn(
                                    "w-16 h-16 rounded-[24px] flex items-center justify-center text-white shadow-2xl transition-all duration-500 group-hover:rotate-6 group-hover:scale-110",
                                    isFull ? "bg-rose-500 shadow-rose-500/40" : "bg-peacock shadow-peacock/40"
                                  )}>
                                    <Bus size={32} />
                                  </div>
                                  <div>
                                    <h4 className="font-black text-2xl text-peacock-dark font-display">{bus.bus_number}</h4>
                                    <div className="flex items-center gap-2 text-sm text-slate-400 font-bold mt-1">
                                      <MapPin size={14} className="text-peacock-light" />
                                      <span>Approaching Stop</span>
                                    </div>
                                  </div>
                                </div>
                                <OccupancyRing current={bus.current_passengers} total={bus.total_seats} />
                              </div>

                              <div className="space-y-6">
                                <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-widest">
                                  <span className="text-slate-400">Seat Availability</span>
                                  <motion.span 
                                    key={bus.current_passengers}
                                    initial={{ scale: 1.2, color: "#005f73" }}
                                    animate={{ scale: 1, color: isFull ? "#f43f5e" : "#005f73" }}
                                    className="font-black"
                                  >
                                    {bus.total_seats - bus.current_passengers} Seats Left
                                  </motion.span>
                                </div>
                                <div className="h-4 bg-slate-100/50 rounded-full overflow-hidden p-1 border border-slate-200/50">
                                  <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${Math.min(100, (bus.current_passengers / bus.total_seats) * 100)}%` }}
                                    transition={{ type: "spring", stiffness: 50, damping: 15 }}
                                    className={cn(
                                      "h-full rounded-full transition-colors duration-500 relative",
                                      isFull ? "bg-rose-500" : "bg-peacock"
                                    )}
                                  >
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                                  </motion.div>
                                </div>

                                <button 
                                  onClick={() => setSelectedBusForSeats(bus)}
                                  className="w-full py-4 bg-white border-2 border-peacock/10 text-peacock font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-peacock hover:text-white hover:border-peacock transition-all duration-500 flex items-center justify-center gap-3 group/btn"
                                >
                                  <Users size={16} className="group-hover/btn:scale-110 transition-transform" />
                                  Check Seat Map
                                </button>
                              </div>
                            </GlassCard>
                          );
                        })}
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* Sidebar Info Panels */}
                  <div className="space-y-10">
                    {/* Google Map */}
                    <GlassCard neonColor="emerald" className="p-8 space-y-6">
                      <div className="flex items-center justify-between">
                        <h3 className="font-black text-slate-900 font-display text-lg">Live Tracking</h3>
                        <div className="flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-100 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                          Real-time
                        </div>
                      </div>
                      <div className="aspect-[4/5] bg-slate-100/50 rounded-[32px] relative overflow-hidden border border-slate-200 shadow-inner group">
                        {!import.meta.env.VITE_GOOGLE_MAPS_API_KEY ? (
                          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-peacock-dark/90 backdrop-blur-md">
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(10,147,150,0.2),transparent_70%)]" />
                            <motion.div 
                              animate={{ y: [0, -10, 0] }}
                              transition={{ duration: 3, repeat: Infinity }}
                              className="w-24 h-24 bg-peacock-light/10 rounded-[32px] flex items-center justify-center text-peacock-light mb-8 border border-peacock-light/20 shadow-[0_0_50px_rgba(10,147,150,0.2)]"
                            >
                              <MapIcon size={40} />
                            </motion.div>
                            <h4 className="text-2xl font-black text-white mb-4 tracking-tight font-display">Map Preview Restricted</h4>
                            <p className="text-sm text-slate-400 font-bold leading-relaxed max-w-[280px]">
                              Google Maps API key is missing. Please add it to your environment variables to enable live tracking.
                            </p>
                            <div className="mt-10 grid grid-cols-4 gap-3 w-full max-w-[280px]">
                              {[1,2,3,4,5,6,7,8].map(i => (
                                <div key={i} className="h-14 bg-white/5 rounded-2xl border border-white/10 animate-pulse" style={{ animationDelay: `${i * 100}ms` }} />
                              ))}
                            </div>
                          </div>
                        ) : (
                          <Map
                            defaultCenter={{ lat: 12.9716, lng: 77.5946 }}
                            defaultZoom={15}
                            mapId="bf51a910020fa566"
                            disableDefaultUI={true}
                            className="w-full h-full"
                          >
                            {stops.map(stop => (
                              <AdvancedMarker
                                key={stop.id}
                                position={{ lat: stop.lat, lng: stop.lng }}
                                title={stop.name}
                              >
                                <div className="w-4 h-4 bg-white border-2 border-slate-400 rounded-full shadow-md" />
                              </AdvancedMarker>
                            ))}
                            {filteredBuses.map(bus => (
                              <AnimatedBusMarker
                                key={bus.id}
                                bus={bus}
                                onClick={() => setSelectedBusId(bus.id)}
                              />
                            ))}

                            {selectedBusId && buses.find(b => b.id === selectedBusId) && (
                              <BusInfoWindow
                                bus={buses.find(b => b.id === selectedBusId)!}
                                onClose={() => setSelectedBusId(null)}
                              />
                            )}
                          </Map>
                        )}
                      </div>
                      <div className="p-5 bg-amber-50/50 rounded-3xl border border-amber-100 flex items-start gap-4 shadow-sm">
                        <div className="w-10 h-10 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600 shrink-0 shadow-[0_0_10px_rgba(245,158,11,0.2)]">
                          <AlertTriangle size={20} />
                        </div>
                        <p className="text-[11px] text-amber-800 font-bold leading-relaxed">
                          Heavy traffic reported near Science Center. Expect 5-10 min delays on Route B.
                        </p>
                      </div>
                    </GlassCard>

                    {/* Alternatives Section */}
                    {alternatives.length > 0 && (
                      <div className="space-y-6">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] px-4">Smart Suggestions</h3>
                        <div className="space-y-4">
                          {alternatives.map(bus => (
                            <motion.div 
                              whileHover={{ x: 8, scale: 1.02 }}
                              key={bus.id} 
                              className="bg-white/70 backdrop-blur-xl p-5 rounded-[32px] border border-slate-200 flex items-center justify-between group hover:border-indigo-500/30 transition-all shadow-sm hover:shadow-[0_0_25px_rgba(79,70,229,0.1)]"
                            >
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-inner">
                                  <Bus size={24} />
                                </div>
                                <div>
                                  <p className="text-sm font-black text-slate-900">{bus.bus_number}</p>
                                  <p className="text-[10px] font-bold text-slate-400">{routes.find(r => r.id === bus.current_route_id)?.name}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-[11px] font-black text-emerald-500 uppercase tracking-widest">{bus.total_seats - bus.current_passengers} Seats</p>
                                <p className="text-[10px] font-bold text-slate-400 mt-0.5">Arriving 4m</p>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
            /* Admin Panel */
            <div className="space-y-10">
              <div className="flex gap-4 p-1 bg-slate-100 rounded-2xl w-fit">
                {(['routes', 'stops', 'fleet', 'logs'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setAdminSubTab(tab)}
                    className={cn(
                      "px-6 py-2.5 rounded-xl text-sm font-black capitalize transition-all",
                      adminSubTab === tab ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                    )}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {adminSubTab === 'routes' && (
                  <>
                    {/* Route Management */}
                    <GlassCard neonColor="indigo" className="space-y-6">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xl font-black">Manage Routes</h3>
                        <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shadow-inner">
                          <RouteIcon size={24} />
                        </div>
                      </div>
                      
                      <div className="flex gap-3">
                        <input 
                          type="text" 
                          value={newRouteName}
                          onChange={(e) => setNewRouteName(e.target.value)}
                          placeholder="New route name..." 
                          className="flex-1 px-4 py-3 bg-slate-100/50 border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-indigo-500/10 focus:bg-white transition-all border"
                        />
                        <button 
                          onClick={addRoute}
                          className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-sm hover:bg-indigo-700 hover:shadow-[0_0_20px_rgba(79,70,229,0.3)] transition-all flex items-center gap-2"
                        >
                          <Plus size={18} />
                          Add
                        </button>
                      </div>

                      <div className="space-y-3">
                        {routes.map(route => (
                          <div key={route.id} className="flex items-center justify-between p-4 bg-slate-50/50 rounded-2xl border border-slate-100 group hover:border-indigo-500/20 transition-all">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-indigo-600 font-black text-xs shadow-sm">
                                {route.id}
                              </div>
                              <span className="font-bold text-sm">{route.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={() => {
                                  setSelectedRouteForStops(route.id);
                                  setRouteStopsToEdit(routeStops.filter(rs => rs.route_id === route.id).sort((a,b) => a.sequence - b.sequence).map(rs => rs.stop_id));
                                }}
                                className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"
                              >
                                <MapPin size={16} />
                              </button>
                              <button 
                                onClick={() => deleteRoute(route.id)}
                                className="p-2 text-slate-400 hover:text-rose-600 transition-colors"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </GlassCard>

                    {/* Route-Stop Association */}
                    {selectedRouteForStops && (
                      <GlassCard neonColor="amber" className="space-y-6">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xl font-black">Stops for {routes.find(r => r.id === selectedRouteForStops)?.name}</h3>
                          <button onClick={() => setSelectedRouteForStops(null)} className="text-slate-400 hover:text-slate-600">
                            <XCircle size={20} />
                          </button>
                        </div>
                        
                        <div className="space-y-4">
                          <div className="flex flex-wrap gap-2">
                            {stops.map(stop => (
                              <button
                                key={stop.id}
                                onClick={() => {
                                  if (routeStopsToEdit.includes(stop.id)) {
                                    setRouteStopsToEdit(routeStopsToEdit.filter(id => id !== stop.id));
                                  } else {
                                    setRouteStopsToEdit([...routeStopsToEdit, stop.id]);
                                  }
                                }}
                                className={cn(
                                  "px-3 py-1.5 rounded-lg text-xs font-bold transition-all border",
                                  routeStopsToEdit.includes(stop.id) 
                                    ? "bg-indigo-600 text-white border-indigo-600 shadow-[0_0_10px_rgba(79,70,229,0.3)]" 
                                    : "bg-white text-slate-500 border-slate-200 hover:border-indigo-300"
                                )}
                              >
                                {stop.name}
                              </button>
                            ))}
                          </div>

                          <div className="p-6 bg-slate-50/50 rounded-3xl border border-slate-100 space-y-3">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Route Sequence</p>
                            {routeStopsToEdit.length === 0 ? (
                              <p className="text-xs text-slate-400 italic">No stops selected</p>
                            ) : (
                              <div className="space-y-2">
                                {routeStopsToEdit.map((stopId, index) => (
                                  <div key={stopId} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
                                    <span className="w-6 h-6 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center text-[10px] font-black">
                                      {index + 1}
                                    </span>
                                    <span className="text-sm font-bold flex-1">{stops.find(s => s.id === stopId)?.name}</span>
                                    <div className="flex gap-1">
                                      <button 
                                        disabled={index === 0}
                                        onClick={() => {
                                          const newArr = [...routeStopsToEdit];
                                          [newArr[index-1], newArr[index]] = [newArr[index], newArr[index-1]];
                                          setRouteStopsToEdit(newArr);
                                        }}
                                        className="p-1 text-slate-400 hover:text-indigo-600 disabled:opacity-30"
                                      >
                                        <Plus size={14} className="rotate-45" />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          <button 
                            onClick={saveRouteStops}
                            className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 hover:shadow-[0_0_20px_rgba(79,70,229,0.4)] transition-all"
                          >
                            Save Route Sequence
                          </button>
                        </div>
                      </GlassCard>
                    )}
                  </>
                )}

                {adminSubTab === 'stops' && (
                  <>
                    {/* Stop Management */}
                    <div className="bg-white rounded-[40px] p-8 border border-slate-200 shadow-sm space-y-6">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xl font-black">Manage Stops</h3>
                        <MapPin size={24} className="text-indigo-600" />
                      </div>
                      
                      <div className="space-y-4">
                        <input 
                          type="text" 
                          value={newStop.name}
                          onChange={(e) => setNewStop({...newStop, name: e.target.value})}
                          placeholder="Stop name..." 
                          className="w-full px-4 py-3 bg-slate-100 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500/20"
                        />
                        <div className="grid grid-cols-2 gap-3">
                          <input 
                            type="number" 
                            value={newStop.lat}
                            onChange={(e) => setNewStop({...newStop, lat: parseFloat(e.target.value)})}
                            placeholder="Latitude" 
                            className="px-4 py-3 bg-slate-100 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500/20"
                          />
                          <input 
                            type="number" 
                            value={newStop.lng}
                            onChange={(e) => setNewStop({...newStop, lng: parseFloat(e.target.value)})}
                            placeholder="Longitude" 
                            className="px-4 py-3 bg-slate-100 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500/20"
                          />
                        </div>
                        <button 
                          onClick={addStop}
                          className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                        >
                          <Plus size={18} />
                          Add New Stop
                        </button>
                      </div>

                      <div className="space-y-3">
                        {stops.map(stop => (
                          <div key={stop.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-indigo-600">
                                <MapPin size={16} />
                              </div>
                              <div>
                                <p className="font-bold text-sm">{stop.name}</p>
                                <p className="text-[10px] text-slate-400 font-bold">{stop.lat.toFixed(4)}, {stop.lng.toFixed(4)}</p>
                              </div>
                            </div>
                            <button 
                              onClick={() => deleteStop(stop.id)}
                              className="p-2 text-slate-400 hover:text-rose-600 transition-colors opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {adminSubTab === 'fleet' && (
                  <GlassCard neonColor="indigo" className="space-y-8 lg:col-span-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-black">Fleet Management</h3>
                      <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shadow-inner">
                        <Bus size={24} />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      {[
                        { label: 'Total Fleet', value: buses.length, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100' },
                        { label: 'Active', value: buses.filter(b => b.status === 'active').length, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
                        { label: 'Suspended', value: buses.filter(b => b.status === 'suspended').length, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100' },
                        { label: 'Avg Load', value: `${Math.round(buses.reduce((acc, b) => acc + b.current_passengers, 0) / (buses.reduce((acc, b) => acc + b.total_seats, 0) || 1) * 100)}%`, color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-100' },
                      ].map((stat, i) => (
                        <div key={i} className={cn("p-6 rounded-3xl border text-center transition-all hover:shadow-lg", stat.bg, stat.border)}>
                          <p className={cn("text-2xl font-black", stat.color)}>{stat.value}</p>
                          <p className={cn("text-[10px] font-black uppercase tracking-widest mt-1", stat.color.replace('600', '500'))}>{stat.label}</p>
                        </div>
                      ))}
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                            <th className="pb-4 px-4">Bus #</th>
                            <th className="pb-4 px-4">Route</th>
                            <th className="pb-4 px-4">Capacity</th>
                            <th className="pb-4 px-4">Status</th>
                            <th className="pb-4 px-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {buses.map(bus => (
                            <tr key={bus.id} className="group hover:bg-slate-50/50 transition-colors">
                              <td className="py-4 px-4">
                                <div className="flex items-center gap-3">
                                  <div className={cn(
                                    "w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-sm",
                                    bus.status === 'active' ? "bg-indigo-600" : "bg-slate-400"
                                  )}>
                                    <Bus size={16} />
                                  </div>
                                  <span className="font-bold text-sm">{bus.bus_number}</span>
                                </div>
                              </td>
                              <td className="py-4 px-4">
                                <select 
                                  value={bus.current_route_id || ''}
                                  onChange={(e) => assignBusToRoute(bus.id, parseInt(e.target.value))}
                                  className="bg-transparent border-none text-sm font-bold text-slate-600 focus:ring-0 cursor-pointer hover:text-indigo-600 transition-colors"
                                >
                                  <option value="">No Route</option>
                                  {routes.map(r => (
                                    <option key={r.id} value={r.id}>{r.name}</option>
                                  ))}
                                </select>
                              </td>
                              <td className="py-4 px-4">
                                <div className="flex items-center gap-4">
                                  <span className="text-sm font-bold min-w-[24px]">{bus.total_seats}</span>
                                  <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200/50">
                                    <motion.div 
                                      initial={{ width: 0 }}
                                      animate={{ width: `${(bus.current_passengers / bus.total_seats) * 100}%` }}
                                      transition={{ type: "spring", stiffness: 50, damping: 15 }}
                                      className={cn(
                                        "h-full rounded-full transition-colors duration-500",
                                        bus.current_passengers >= bus.total_seats ? "bg-rose-500" : "bg-indigo-500"
                                      )}
                                    />
                                  </div>
                                </div>
                              </td>
                              <td className="py-4 px-4">
                                <span className={cn(
                                  "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm",
                                  bus.status === 'active' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-rose-50 text-rose-600 border-rose-100"
                                )}>
                                  {bus.status}
                                </span>
                              </td>
                              <td className="py-4 px-4 text-right">
                                <button 
                                  onClick={async () => {
                                    const newStatus = bus.status === 'active' ? 'suspended' : 'active';
                                    await fetch('/api/admin/suspend', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ busId: bus.id, status: newStatus })
                                    });
                                  }}
                                  className={cn(
                                    "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border",
                                    bus.status === 'active' ? "text-rose-600 border-rose-100 hover:bg-rose-50" : "text-emerald-600 border-emerald-100 hover:bg-emerald-50"
                                  )}
                                >
                                  {bus.status === 'active' ? 'Suspend' : 'Activate'}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </GlassCard>
                )}

                {adminSubTab === 'logs' && (
                  <div className="lg:col-span-2 space-y-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                      {/* Boarding Logs */}
                      <GlassCard neonColor="indigo" className="space-y-6">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xl font-black">Boarding Activity</h3>
                          <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shadow-inner">
                            <Users size={24} />
                          </div>
                        </div>
                        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-200">
                          {logs.boarding.map((log: any) => (
                            <div key={log.id} className="flex items-center justify-between p-4 bg-slate-50/50 rounded-2xl border border-slate-100 hover:border-indigo-500/20 transition-all">
                              <div className="flex items-center gap-3">
                                <div className={cn(
                                  "w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-sm",
                                  log.type === 'entry' ? "bg-emerald-500" : "bg-rose-500"
                                )}>
                                  {log.type === 'entry' ? <Plus size={16} /> : <Trash2 size={16} className="rotate-45" />}
                                </div>
                                <div>
                                  <p className="text-sm font-bold">Bus {buses.find(b => b.id === log.bus_id)?.bus_number}</p>
                                  <p className="text-[10px] text-slate-400 font-bold">{new Date(log.timestamp).toLocaleString()}</p>
                                </div>
                              </div>
                              <span className={cn(
                                "text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg border",
                                log.type === 'entry' ? "text-emerald-600 border-emerald-100 bg-emerald-50/50" : "text-rose-600 border-rose-100 bg-rose-50/50"
                              )}>
                                {log.type}
                              </span>
                            </div>
                          ))}
                        </div>
                      </GlassCard>

                      {/* Campus Logs */}
                      <GlassCard neonColor="peacock" className="space-y-6">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xl font-black">Campus Entry/Exit</h3>
                          <div className="w-12 h-12 bg-peacock/5 rounded-2xl flex items-center justify-center text-peacock shadow-inner">
                            <Shield size={24} />
                          </div>
                        </div>
                        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-200">
                          {logs.campus.map((log: any) => (
                            <div key={log.id} className="flex items-center justify-between p-4 bg-slate-50/50 rounded-2xl border border-slate-100 hover:border-emerald-500/20 transition-all">
                              <div className="flex items-center gap-3">
                                <div className={cn(
                                  "w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-sm",
                                  log.type === 'entry' ? "bg-peacock" : "bg-amber-500"
                                )}>
                                  <Navigation size={16} />
                                </div>
                                <div>
                                  <p className="text-sm font-bold">Bus {buses.find(b => b.id === log.bus_id)?.bus_number}</p>
                                  <p className="text-[10px] text-slate-400 font-bold">{new Date(log.timestamp).toLocaleString()}</p>
                                </div>
                              </div>
                              <span className={cn(
                                "text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg border",
                                log.type === 'entry' ? "text-peacock border-peacock/10 bg-peacock/5" : "text-amber-600 border-amber-100 bg-amber-50/50"
                              )}>
                                {log.type}
                              </span>
                            </div>
                          ))}
                        </div>
                      </GlassCard>
                    </div>

                    {/* Simulation Controls */}
                    <div className="bg-slate-900 rounded-[40px] p-10 text-white space-y-8">
                      <div>
                        <h3 className="text-2xl font-black mb-2">System Simulation</h3>
                        <p className="text-slate-400 font-medium">Trigger events to test real-time monitoring and logging.</p>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {buses.slice(0, 4).map(bus => (
                          <div key={bus.id} className="p-6 bg-white/5 rounded-3xl border border-white/10 space-y-4">
                            <p className="font-bold text-sm">{bus.bus_number}</p>
                            <div className="flex gap-2">
                              <button 
                                onClick={async () => {
                                  await fetch('/api/campus/log', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ busId: bus.id, type: 'entry' })
                                  });
                                  fetchLogs();
                                }}
                                className="flex-1 py-2 bg-peacock rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-peacock-dark transition-all"
                              >
                                Entry
                              </button>
                              <button 
                                onClick={async () => {
                                  await fetch('/api/campus/log', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ busId: bus.id, type: 'exit' })
                                  });
                                  fetchLogs();
                                }}
                                className="flex-1 py-2 bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/20 transition-all"
                              >
                                Exit
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Boarding Simulation Modal */}
      <AnimatePresence>
        {showScanner && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowScanner(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[48px] p-10 shadow-2xl text-center"
            >
              <div className="w-24 h-24 bg-peacock/5 rounded-[32px] flex items-center justify-center text-peacock mx-auto mb-8">
                <QrCode size={48} />
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-2">Scan to Board</h3>
              <p className="text-slate-500 font-medium mb-10">Simulating QR scan for the nearest bus on your route.</p>
              
              <div className="space-y-4">
                {filteredBuses.slice(0, 2).map(bus => (
                  <div key={bus.id} className="p-6 bg-slate-50 rounded-3xl border border-slate-100 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-slate-900">{bus.bus_number}</span>
                      <span className="text-xs font-bold text-slate-400">{bus.total_seats - bus.current_passengers} Seats Left</span>
                    </div>
                    <div className="flex gap-3">
                      <button 
                        onClick={async () => {
                          await fetch('/api/board', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ busId: bus.id, userId: user.id, type: 'entry' })
                          });
                          setShowScanner(false);
                        }}
                        className="flex-1 py-4 bg-peacock text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-peacock-dark transition-all flex items-center justify-center gap-2"
                      >
                        <CheckCircle2 size={18} />
                        Board
                      </button>
                      <button 
                        onClick={async () => {
                          await fetch('/api/board', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ busId: bus.id, userId: user.id, type: 'exit' })
                          });
                          setShowScanner(false);
                        }}
                        className="px-6 py-4 bg-white text-slate-400 rounded-2xl font-black text-xs uppercase tracking-widest border border-slate-200 hover:bg-slate-50 transition-all"
                      >
                        <XCircle size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <button 
                onClick={() => setShowScanner(false)}
                className="mt-8 text-xs font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors"
              >
                Cancel
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedBusForSeats && (
          <SeatMap 
            bus={selectedBusForSeats} 
            onClose={() => setSelectedBusForSeats(null)} 
          />
        )}
      </AnimatePresence>
    </div>
    </APIProvider>
  );
}
