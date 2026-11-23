import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { apiFetch } from './api';
import './styles.css';
import './catalog-menu.css';
import './gallery.css';
import './business-registration.css';
import BusinessRegistrationWizard from './BusinessRegistrationWizard';
import AdminDashboard from './AdminDashboard';
import './location-hotbar.css';
import './destination-planner.css';
import './hotbar.css';
import './android.css';

// En producción Vite reemplaza esta URL durante el build con el endpoint público de la API.
const API = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';
const API_ORIGIN = new URL(API).origin;
const SESSION_IDLE_TIMEOUT_MS = 30 * 60 * 1000;
const SESSION_REFRESH_INTERVAL_MS = 5 * 60 * 1000;
type Service = { id: string; name: string; description?: string | null; price?: string | number | null; priceUnit?: string | null };
type MenuItem = { id: string; name: string; description?: string | null; category?: string | null; price: string | number; imageUrl?: string | null };
type RoomType = { id: string; businessId: string; name: string; description: string; maxAdults: number; maxChildren: number; bedDescription: string; areaSqm?: number | string | null; quantity: number; nightlyRate: number | string; breakfastIncluded: boolean; refundable: boolean; cancellationPolicy: string; prepaymentPolicy: string; amenities: string[]; isAvailable: boolean };
type RestaurantDetail = { openingHours: Record<string,string>; closedDays: string[]; serviceOptions: string[]; paymentMethods: string[]; dietaryOptions: string[]; atmosphere?: string | null; capacity?: number | null; averageSpend?: number | string | null; reservationRequired: boolean; accessibilityInfo?: string | null };
type TourDetail = { durationMinutes: number; schedules: string[]; meetingPoint: string; minGroupSize: number; maxGroupSize?: number | null; minAge?: number | null; maxAge?: number | null; included: string[]; requirements: string[]; physicalLevel: string; languages: string[]; cancellationPolicy: string; weatherPolicy?: string | null; accessibilityInfo?: string | null };
type Business = { id: string; name: string; category: { name: string; slug: string }; zone: string; shortDescription: string; description: string; address: string; whatsappNumber: string; status?: string; latitude?: number | string | null; longitude?: number | string | null; instagramUrl?: string | null; isFeatured?: boolean; isVerified?: boolean; basePrice?: string | number | null; priceUnit?: string | null; media: { id: string; imageUrl?: string | null; mimeType?: string | null; isCover: boolean; displayOrder: number }[]; accommodation?: { amenities: string[]; occupancyStatus: string; checkInTime?: string | null; checkOutTime?: string | null; maxGuestsPerUnit?: number | null; smokingAllowed?: boolean; eventsAllowed?: boolean; petsPolicy?: string } | null; roomTypes: RoomType[]; restaurantDetail?: RestaurantDetail | null; tourDetail?: TourDetail | null; services: Service[]; menuItems: MenuItem[] };
type Municipality = { name: string; department: string; tagline: string; introduction: string; history: string; culture: string; nature: string; flora?: string; fauna?: string; places?: string; geography?: string; wikipediaSummary?: string | null; wikipediaUrl?: string | null; wikipediaThumbnail?: string | null; coverImageUrl?: string | null };
type MunicipalityPhoto = { id: string; key: string; caption: string; period: string; imageUrl: string; credit?: string | null; sourceUrl?: string | null; isHistorical: boolean; displayOrder: number };
type GalleryPhoto = { id: string; caption: string; category: string; location: string; createdAt: string; imageUrl: string; isSample: boolean; likesCount: number; likedByMe: boolean; sourceCredit?: string | null; sourceUrl?: string | null; user: { fullName: string } };
type SignedInUser = { id: string; fullName: string; email: string; role?: string };
type GoogleCredential = { credential: string };
declare global {
  interface Window {
    google?: { accounts: { id: {
      initialize: (options: { client_id: string; callback: (response: GoogleCredential) => void }) => void;
      renderButton: (target: HTMLElement, options: Record<string, string | number | boolean>) => void;
    } } };
  }
}
const categories = ['Todo', 'Hoteles', 'Restaurantes', 'Tours', 'Transportes'];
const directoryCategories = categories.filter((category) => category !== 'Transportes');
const destinationPhotos = {
  town: '/images/puerto-escondido/letras-puerto-mar.webp',
  sunset: '/images/puerto-escondido/atardecer-caribe.webp',
  dining: '/images/puerto-escondido/palapas-locales.webp',
  beach: '/images/puerto-escondido/playa-palmeras.webp',
  lodging: '/images/puerto-escondido/alojamiento-piscina.webp',
  pier: '/images/puerto-escondido/pasarela-palmeras.webp',
  coast: '/images/puerto-escondido/costa-palmeras.webp',
  bullerengue: '/images/puerto-escondido/bullerengue-plazoleta.webp',
  turtle: '/images/puerto-escondido/tortuga-muelle.webp',
  sunsetBoats: '/images/puerto-escondido/atardecer-pescadores.webp',
  pierSunset: '/images/puerto-escondido/muelle-atardecer.webp',
  swordfish: '/images/puerto-escondido/pez-espada-palapas.webp',
  kiosks: '/images/puerto-escondido/kioscos-caribe.webp',
  mural: '/images/puerto-escondido/mural-pueblo.webp',
} as const;
const municipalityPhotos = [
  { src: destinationPhotos.bullerengue, caption: 'Monumento al bullerengue en el centro', period: 'CULTURA Y TRADICIÓN' },
  { src: destinationPhotos.turtle, caption: 'Escultura de tortuga junto al muelle', period: 'PATRIMONIO COSTERO' },
  { src: destinationPhotos.sunsetBoats, caption: 'Atardecer en la costa con embarcaciones', period: 'MAR Y VIDA LOCAL' },
  { src: destinationPhotos.pierSunset, caption: 'El muelle turístico al caer la tarde', period: 'PAISAJE COSTERO' },
  { src: destinationPhotos.swordfish, caption: 'Escultura de pez espada entre palmeras', period: 'SÍMBOLOS DEL LITORAL' },
  { src: destinationPhotos.town, caption: 'Letras de Puerto Escondido frente al mar', period: 'BIENVENIDA AL PUERTO' },
  { src: destinationPhotos.kiosks, caption: 'Kioscos tradicionales de la zona costera', period: 'VIDA Y ENCUENTRO' },
  { src: destinationPhotos.mural, caption: 'Mural en una calle del municipio', period: 'ARTE LOCAL' },
  { src: destinationPhotos.pier, caption: 'Pasarela del muelle entre palmeras', period: 'MUELLE TURÍSTICO' },
];
const picture = (url?: string | null) => url || destinationPhotos.coast;
const transportFallbackPhotos = [
  destinationPhotos.town,
  destinationPhotos.pier,
  destinationPhotos.coast,
  destinationPhotos.beach,
];
const apiImage = (path: string) => path.startsWith('http') ? path : `${API_ORIGIN}${path}`;
// Un costo cero representa una prestación incluida; los valores null se consultan con el proveedor.
const money = (value?: string | number | null) => value == null ? 'Consultar' : Number(value) === 0 ? 'Incluido' : `$ ${Number(value).toLocaleString('es-CO')}`;

type IconName = 'sparkles' | 'bed' | 'utensils' | 'compass' | 'map' | 'calendar' | 'landmark' | 'image' | 'heart' | 'arrow' | 'pin' | 'chevron';

// SVGs ligeros basados en el lenguaje visual de Lucide, sin cargar una fuente de iconos externa.
function NavIcon({ name, className = '' }: { name: IconName; className?: string }) {
  const shapes: Record<IconName, React.ReactNode> = {
    sparkles: <><path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-2-5.8L4 11l6-2.2L12 3Z"/><path d="m19 14 1.1 2.9L23 18l-2.9 1.1L19 22l-1.1-2.9L15 18l2.9-1.1L19 14Z"/></>,
    bed: <><path d="M3 18v-5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5"/><path d="M3 15h18M5 11V8a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3M3 18v2m18-2v2"/></>,
    utensils: <><path d="M7 3v7m-3-7v4a3 3 0 0 0 6 0V3M7 10v11m10-18v18m0-18c3 2 4 6 0 9"/></>,
    compass: <><circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5 5-2Z"/></>,
    map: <><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Z"/><path d="M9 3v15m6-12v15"/></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></>,
    landmark: <><path d="m3 10 9-7 9 7M5 10v9m5-9v9m4-9v9m5-9v9M3 21h18M2 19h20"/></>,
    image: <><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></>,
    heart: <><path d="M20.8 8.8c0 5.5-8.8 11-8.8 11s-8.8-5.5-8.8-11A4.8 4.8 0 0 1 12 6.4a4.8 4.8 0 0 1 8.8 2.4Z"/></>,
    arrow: <><path d="M7 17 17 7M7 7h10v10"/></>,
    pin: <><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>,
    chevron: <path d="m7 10 5 5 5-5"/>,
  };
  return <svg className={className} viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{shapes[name]}</svg>;
}

// El navegador lee los lugares desde la API; el contenido ya no se duplica como un arreglo local.
async function getData<T>(path: string): Promise<T> {
  const response = await apiFetch(`${API}${path}`, { cache: 'no-store' });
  if (!response.ok) throw new Error(`La API respondió ${response.status}`);
  return (await response.json()).data as T;
}

// Navegación liviana con History API para abrir páginas sin recargar la aplicación React.
function useRoute() {
  const [route, setRoute] = useState(window.location.pathname + window.location.search);
  const path = route.split('?')[0];
  useEffect(() => {
    const onPopState = () => setRoute(window.location.pathname + window.location.search);
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);
  const go = (to: string) => {
    const destination = new URL(to, window.location.origin);
    const nextRoute = destination.pathname + destination.search;
    if (window.location.pathname + window.location.search !== nextRoute) window.history.pushState({}, '', nextRoute);
    setRoute(nextRoute);
    document.querySelectorAll('details[open]').forEach((dropdown) => dropdown.removeAttribute('open'));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  return { path, route, go };
}

function App() {
  const { path, route, go } = useRoute();
  const [places, setPlaces] = useState<Business[]>([]);
  const [catalogPlaces, setCatalogPlaces] = useState<Business[]>([]);
  const [catalogTotal, setCatalogTotal] = useState(0);
  const [catalogTotalPages, setCatalogTotalPages] = useState(1);
  const [catalogCategoryCounts, setCatalogCategoryCounts] = useState<Record<string, number>>({});
  const [catalogZones, setCatalogZones] = useState<string[]>([]);
  const [catalogPage, setCatalogPage] = useState(1);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [town, setTown] = useState<Municipality | null>(null);
  const [townPhotos, setTownPhotos] = useState<MunicipalityPhoto[]>([]);
  const [gallery, setGallery] = useState<GalleryPhoto[]>([]);
  const [galleryTotal, setGalleryTotal] = useState(0);
  const [galleryAllTotal, setGalleryAllTotal] = useState(0);
  const [galleryTotalPages, setGalleryTotalPages] = useState(1);
  const [galleryCategoryCounts, setGalleryCategoryCounts] = useState<Record<string, number>>({});
  const [galleryPage, setGalleryPage] = useState(1);
  const [galleryRefresh, setGalleryRefresh] = useState(0);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [galleryError, setGalleryError] = useState('');
  const [gallerySort, setGallerySort] = useState<'recent' | 'popular'>('recent');
  const [galleryCategory, setGalleryCategory] = useState('Todas');
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionIdleTimeoutMs, setSessionIdleTimeoutMs] = useState(SESSION_IDLE_TIMEOUT_MS);
  const [currentUser, setCurrentUser] = useState<SignedInUser | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authNotice, setAuthNotice] = useState<'favorite' | 'saved' | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('register');
  const [afterLoginAction, setAfterLoginAction] = useState<'none' | 'upload' | 'favorite' | 'business' | 'admin'>('none');
  const [pendingFavoriteId, setPendingFavoriteId] = useState<string | null>(null);
  const [favoriteError, setFavoriteError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authFullName, setAuthFullName] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authAccountType, setAuthAccountType] = useState<'TOURIST' | 'BUSINESS_OWNER'>('TOURIST');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [googleError, setGoogleError] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState('');
  const [photoCategory, setPhotoCategory] = useState('Playas y mar');
  const [photoLocation, setPhotoLocation] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState<GalleryPhoto | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<Business | null>(null);
  const [inquiryOpen, setInquiryOpen] = useState(false);
  const [inquiryName, setInquiryName] = useState('');
  const [inquiryPhone, setInquiryPhone] = useState('');
  const [inquiryVisitDate, setInquiryVisitDate] = useState('');
  const [inquiryCheckOut, setInquiryCheckOut] = useState('');
  const [inquiryGuests, setInquiryGuests] = useState(2);
  const [inquiryRoomName, setInquiryRoomName] = useState('');
  const [inquiryBusy, setInquiryBusy] = useState(false);
  const [inquiryError, setInquiryError] = useState('');
  const [activePlaceImage, setActivePlaceImage] = useState(0);
  const [previousPlaceImage, setPreviousPlaceImage] = useState<string | null>(null);
  const [cardImageIndices, setCardImageIndices] = useState<Record<string, number>>({});
  const [transportImageIndices, setTransportImageIndices] = useState<Record<string, number>>({});
  const swipeStartX = useRef<number | null>(null);
  const [error, setError] = useState('');
  const [active, setActive] = useState(() => new URLSearchParams(window.location.search).get('categoria') || 'Todo');
  const [query, setQuery] = useState('');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [locationType, setLocationType] = useState('');
  const [locationZone, setLocationZone] = useState('');
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);
  const [saved, setSaved] = useState<string[]>([]);
  const [menu, setMenu] = useState(false);
  const scrollProgressRef = useRef<HTMLSpanElement | null>(null);
  const [openDropdown, setOpenDropdown] = useState<'explore' | 'planner' | 'things' | null>(null);
  const [pinnedDropdown, setPinnedDropdown] = useState<'explore' | 'planner' | 'things' | null>(null);
  const [managedHotels, setManagedHotels] = useState<(Business & { roomTypes: RoomType[] })[]>([]);
  const [hotelManagementError, setHotelManagementError] = useState('');
  const [businessDetailSaving, setBusinessDetailSaving] = useState<string | null>(null);
  const [roomSaving, setRoomSaving] = useState(false);
  const [businessFormOpen, setBusinessFormOpen] = useState(false);
  const [businessRegistrationLoading, setBusinessRegistrationLoading] = useState(false);
  const [businessRegistrationError, setBusinessRegistrationError] = useState('');
  const [newHotel, setNewHotel] = useState({ categorySlug: 'hoteles', name: '', zone: '', shortDescription: '', description: '', address: '', whatsappNumber: '', latitude: '9.02', longitude: '-76.18', basePrice: '', priceUnit: '' });
  const [staySearch, setStaySearch] = useState({ checkIn: '', checkOut: '', adults: 2, children: 0, rooms: 1 });
  const [tripDays, setTripDays] = useState<1 | 2 | 3>(2);
  const [roomDraft, setRoomDraft] = useState({ businessId: '', name: '', description: '', maxAdults: 2, maxChildren: 0, bedDescription: '', areaSqm: '', quantity: 1, nightlyRate: '', breakfastIncluded: false, refundable: true, cancellationPolicy: 'Cancelación flexible', prepaymentPolicy: 'Sin pago por adelantado', amenities: '', isAvailable: true });

  useEffect(() => {
    let active = true;
    const legacyToken = localStorage.getItem('puerto-auth-token');
    const headers = legacyToken ? { Authorization: `Bearer ${legacyToken}` } : undefined;
    apiFetch(`${API}/auth/session`, { headers })
      .then(async (response) => {
        if (!response.ok) throw new Error('No hay una sesión activa.');
        const result = await response.json();
        if (!active) return;
        setCurrentUser(result.data.user as SignedInUser);
        setSessionIdleTimeoutMs(Number(result.data.idleTimeoutMs) || SESSION_IDLE_TIMEOUT_MS);
        setSessionActive(true);
      })
      .catch(() => {
        if (active) {
          setCurrentUser(null);
          setSessionActive(false);
        }
      })
      .finally(() => {
        localStorage.removeItem('puerto-auth-token');
        localStorage.removeItem('puerto-auth-user');
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const updateProgress = () => {
      const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = scrollableHeight > 0 ? (window.scrollY / scrollableHeight) * 100 : 0;
      const normalizedProgress = Math.min(100, Math.max(0, progress));
      if (scrollProgressRef.current) {
        scrollProgressRef.current.style.transform = `scaleX(${normalizedProgress / 100})`;
        scrollProgressRef.current.parentElement?.setAttribute('aria-valuenow', String(Math.round(normalizedProgress)));
      }
    };
    updateProgress();
    window.addEventListener('scroll', updateProgress, { passive: true });
    window.addEventListener('resize', updateProgress);
    return () => {
      window.removeEventListener('scroll', updateProgress);
      window.removeEventListener('resize', updateProgress);
    };
  }, [route]);

  useEffect(() => {
    if (!sessionActive) return;
    let idleTimer = 0;
    let lastActivityAt = 0;
    let lastSessionRefresh = Date.now();
    let refreshInFlight = false;
    let expired = false;

    const endSession = () => {
      if (expired) return;
      expired = true;
      void apiFetch(`${API}/auth/logout`, { method: 'POST' }).finally(() => {
        setSessionActive(false);
        setCurrentUser(null);
        setSaved([]);
      });
    };
    const resetIdleTimer = () => {
      window.clearTimeout(idleTimer);
      idleTimer = window.setTimeout(endSession, sessionIdleTimeoutMs);
    };
    const markActivity = () => {
      const now = Date.now();
      if (now - lastActivityAt < 1000) return;
      lastActivityAt = now;
      resetIdleTimer();

      if (!refreshInFlight && now - lastSessionRefresh >= SESSION_REFRESH_INTERVAL_MS) {
        refreshInFlight = true;
        lastSessionRefresh = now;
        void apiFetch(`${API}/auth/session`)
          .then((response) => {
            if (response.status === 401) endSession();
            if (response.ok) return response.json();
            return null;
          })
          .then((result) => { if (result?.data?.user) setCurrentUser(result.data.user as SignedInUser); })
          .catch(() => undefined)
          .finally(() => { refreshInFlight = false; });
      }
    };

    resetIdleTimer();
    const activityEvents: (keyof WindowEventMap)[] = ['pointerdown', 'pointermove', 'keydown', 'touchstart', 'scroll', 'wheel'];
    activityEvents.forEach((eventName) => window.addEventListener(eventName, markActivity, { passive: true }));
    return () => {
      window.clearTimeout(idleTimer);
      activityEvents.forEach((eventName) => window.removeEventListener(eventName, markActivity));
    };
  }, [sessionActive, sessionIdleTimeoutMs]);

  const openQuickInquiry = (roomName = '') => {
    setInquiryRoomName(roomName);
    setInquiryName(currentUser?.fullName || '');
    setInquiryPhone('');
    setInquiryVisitDate(staySearch.checkIn);
    setInquiryCheckOut(staySearch.checkOut);
    setInquiryGuests(staySearch.adults + staySearch.children || 2);
    setInquiryError('');
    setInquiryOpen(true);
  };

  const submitQuickInquiry = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedPlace) return;
    const isAccommodation = selectedPlace.category.slug === 'hoteles';
    setInquiryBusy(true);
    setInquiryError('');
    try {
      const response = await apiFetch(`${API}/inquiries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: selectedPlace.id,
          guestName: inquiryName,
          guestPhone: inquiryPhone || null,
          checkInDate: inquiryVisitDate,
          checkOutDate: isAccommodation ? inquiryCheckOut : null,
          guestsCount: inquiryGuests,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message || 'No fue posible guardar tu solicitud. Intenta de nuevo.');

      const formatDate = (value: string) => new Date(`${value}T12:00:00`).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
      const requestDetails = isAccommodation
        ? `consultar disponibilidad${inquiryRoomName ? ` de ${inquiryRoomName}` : ''} del ${formatDate(inquiryVisitDate)} al ${formatDate(inquiryCheckOut)} para ${inquiryGuests} ${inquiryGuests === 1 ? 'persona' : 'personas'}`
        : `consultar disponibilidad para visitar el ${formatDate(inquiryVisitDate)} para ${inquiryGuests} ${inquiryGuests === 1 ? 'persona' : 'personas'}`;
      const phoneLine = inquiryPhone ? ` Mi teléfono de contacto es ${inquiryPhone}.` : '';
      const message = `Hola ${selectedPlace.name} 👋, los encontré en la Guía Oficial de Puerto Escondido. Soy ${inquiryName} y me gustaría ${requestDetails}.${phoneLine} ¡Gracias!`;
      window.location.assign(`https://wa.me/573144856766?text=${encodeURIComponent(message)}`);
    } catch (problem) {
      setInquiryError(problem instanceof Error ? problem.message : 'No fue posible guardar tu solicitud. Intenta de nuevo.');
    } finally {
      setInquiryBusy(false);
    }
  };

  useEffect(() => {
    getData<Business[]>('/businesses?limit=100').then(setPlaces).catch(() => setError('No fue posible cargar los lugares. Comprueba que la API y PostgreSQL estén en ejecución.'));
    getData<Municipality>('/municipality').then(setTown).catch(() => setError('No fue posible cargar la información municipal.'));
    getData<MunicipalityPhoto[]>('/municipality/media').then(setTownPhotos).catch(() => setTownPhotos([]));
  }, []);

  useEffect(() => {
    if (path !== '/lugares') return;
    let activeRequest = true;
    const timeout = window.setTimeout(() => {
      setCatalogLoading(true);
      const params = new URLSearchParams({ page: String(catalogPage), limit: '12' });
      params.set('excludeCategory', 'transportes');
      if (active !== 'Todo') params.set('category', active.toLowerCase());
      if (query.trim()) params.set('search', query.trim());
      if (priceMin) params.set('minPrice', priceMin);
      if (priceMax) params.set('maxPrice', priceMax);
      if (locationType) params.set('zoneType', locationType);
      if (locationZone) params.set('zone', locationZone);
      if (selectedFeatures.length) params.set('features', selectedFeatures.join(','));
      apiFetch(`${API}/businesses?${params.toString()}`, { cache: 'no-store' })
        .then(async (response) => {
          if (!response.ok) throw new Error(`La API respondió ${response.status}`);
          return await response.json() as { data: Business[]; pagination: { total: number; totalPages: number; categoryCounts: Record<string, number>; zones: string[] } };
        })
        .then((result) => {
          if (!activeRequest) return;
          setCatalogPlaces(result.data);
          setCatalogTotal(result.pagination.total);
          setCatalogTotalPages(Math.max(1, result.pagination.totalPages));
          setCatalogCategoryCounts(result.pagination.categoryCounts || {});
          setCatalogZones(result.pagination.zones || []);
        })
        .catch(() => { if (activeRequest) setError('No fue posible cargar esta página del directorio.'); })
        .finally(() => { if (activeRequest) setCatalogLoading(false); });
    }, query.trim() ? 250 : 0);
    return () => { activeRequest = false; window.clearTimeout(timeout); };
  }, [path, active, query, catalogPage, priceMin, priceMax, locationType, locationZone, selectedFeatures]);

  useEffect(() => {
    if (path !== '/mis-hoteles' || !sessionActive) return;
    apiFetch(`${API}/hotel-management/mine`, { headers: { } })
      .then(async (response) => { const result = await response.json(); if (!response.ok) throw new Error(result.error?.message || 'No fue posible cargar tus hoteles.'); setManagedHotels(result.data); })
      .catch((problem) => setHotelManagementError(problem instanceof Error ? problem.message : 'No fue posible cargar tus hoteles.'));
  }, [path, sessionActive]);

  // Los accesos del menú comparten la página de directorio, pero abren el filtro elegido.
  useEffect(() => {
    const params = new URLSearchParams(route.split('?')[1] || '');
    const selected = params.get('categoria') || params.get('category');
    if (path === '/lugares' && selected?.toLowerCase() === 'transportes') {
      go('/transportes');
      return;
    }
    setActive(categories.find((item) => item.toLowerCase() === selected?.toLowerCase()) || 'Todo');
    setQuery(params.get('search') || '');
    setPriceMin(params.get('minPrice') || '');
    setPriceMax(params.get('maxPrice') || '');
    setLocationType(params.get('zoneType') || '');
    setLocationZone(params.get('zone') || '');
    setSelectedFeatures((params.get('features') || '').split(',').filter(Boolean));
    setAdvancedFiltersOpen(Boolean(params.get('minPrice') || params.get('maxPrice') || params.get('zoneType') || params.get('zone') || params.get('features')));
  }, [route, path]);

  // Cada cuenta consulta sus favoritos en PostgreSQL al autenticarse.
  useEffect(() => {
    let activeRequest = true;
    if (!sessionActive) { setSaved([]); return () => { activeRequest = false; }; }
    apiFetch(`${API}/favorites`, { headers: { } })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error?.message || 'No se pudieron cargar tus guardados.');
        if (activeRequest) setSaved((result.data as { businessId: string }[]).map((item) => item.businessId));
      })
      .catch((problem) => { if (activeRequest) setFavoriteError(problem instanceof Error ? problem.message : 'No se pudieron cargar tus guardados.'); });
    return () => { activeRequest = false; };
  }, [sessionActive]);

  const finishAuthentication = async (user: SignedInUser, idleTimeoutMs?: number) => {
    let sessionUser = user;
    if (afterLoginAction === 'business' && user.role === 'TOURIST') {
      const response = await apiFetch(`${API}/auth/business-owner`, { method: 'POST', headers: { } });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message || 'No se pudo habilitar tu cuenta de anfitrión.');
      sessionUser = result.data.user as SignedInUser;
      idleTimeoutMs = Number(result.data.idleTimeoutMs) || idleTimeoutMs;
    }
    if (afterLoginAction === 'favorite' && pendingFavoriteId) {
      const response = await apiFetch(`${API}/favorites`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', },
        body: JSON.stringify({ businessId: pendingFavoriteId }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message || 'No se pudo guardar este lugar.');
      setSaved((items) => items.includes(pendingFavoriteId) ? items : [...items, pendingFavoriteId]);
      setPendingFavoriteId(null);
    }
    if (idleTimeoutMs) setSessionIdleTimeoutMs(idleTimeoutMs);
    setSessionActive(true);
    setCurrentUser(sessionUser);
    setAuthOpen(false);
    if (afterLoginAction === 'upload') setUploadOpen(true);
    if (afterLoginAction === 'business') { setBusinessFormOpen(true); go('/registrar-negocio'); }
    if (afterLoginAction === 'admin') go('/admin');
    setAfterLoginAction('none');
    setAuthPassword('');
  };

  const toggleFavorite = async (businessId: string) => {
    setFavoriteError('');
    if (!sessionActive) {
      setPendingFavoriteId(businessId);
      setAfterLoginAction('favorite');
      setAuthNotice('favorite');
      return;
    }
    const removing = saved.includes(businessId);
    try {
      const response = await apiFetch(removing ? `${API}/favorites/${businessId}` : `${API}/favorites`, {
        method: removing ? 'DELETE' : 'POST',
        headers: {  ...(removing ? {} : { 'Content-Type': 'application/json' }) },
        ...(removing ? {} : { body: JSON.stringify({ businessId }) }),
      });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error?.message || 'No se pudo actualizar tu lista de favoritos.');
      }
      setSaved((items) => removing ? items.filter((id) => id !== businessId) : items.includes(businessId) ? items : [...items, businessId]);
    } catch (problem) {
      setFavoriteError(problem instanceof Error ? problem.message : 'No se pudo actualizar tu lista de favoritos.');
    }
  };

  const saveRoom = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setHotelManagementError(''); setRoomSaving(true);
    try {
      const response = await apiFetch(`${API}/hotel-management/${roomDraft.businessId}/rooms`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', },
        body: JSON.stringify({ ...roomDraft, areaSqm: roomDraft.areaSqm || null, nightlyRate: Number(roomDraft.nightlyRate), amenities: roomDraft.amenities.split(',').map((item) => item.trim()).filter(Boolean) }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message || 'No se pudo guardar la habitación.');
      setManagedHotels((hotels) => hotels.map((hotel) => hotel.id === roomDraft.businessId ? { ...hotel, roomTypes: [...hotel.roomTypes, result.data] } : hotel));
      setRoomDraft((draft) => ({ ...draft, name: '', description: '', bedDescription: '', areaSqm: '', nightlyRate: '', amenities: '' }));
    } catch (problem) { setHotelManagementError(problem instanceof Error ? problem.message : 'No se pudo guardar la habitación.'); }
    finally { setRoomSaving(false); }
  };

  const startBusinessRegistration = async (categorySlug = 'hoteles') => {
    setNewHotel((draft) => ({ ...draft, categorySlug }));
    setBusinessRegistrationError('');
    if (!sessionActive) {
      setBusinessFormOpen(true);
      setAfterLoginAction('business');
      setAuthAccountType('BUSINESS_OWNER');
      setAuthMode('register');
      setGoogleError('');
      setAuthOpen(true);
      return;
    }
    if (currentUser?.role === 'TOURIST') {
      setBusinessRegistrationLoading(true);
      try {
        const response = await apiFetch(`${API}/auth/business-owner`, { method: 'POST', headers: { } });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error?.message || 'No se pudo habilitar tu cuenta de anfitrión.');
        const { user } = result.data as { user: SignedInUser };
        setSessionIdleTimeoutMs(Number(result.data.idleTimeoutMs) || SESSION_IDLE_TIMEOUT_MS);
        setSessionActive(true);
        setCurrentUser(user);
      } catch (problem) {
        setBusinessRegistrationError(problem instanceof Error ? problem.message : 'No se pudo habilitar tu cuenta de anfitrión.');
        setBusinessRegistrationLoading(false);
        return;
      }
      setBusinessRegistrationLoading(false);
    }
    setBusinessFormOpen(true);
  };

  const saveBusinessDetails = async (event: React.FormEvent<HTMLFormElement>, business: Business) => {
    event.preventDefault(); setHotelManagementError(''); setBusinessDetailSaving(business.id);
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    const list = (key: string) => String(values[key] || '').split(',').map((item) => item.trim()).filter(Boolean);
    let body: Record<string, unknown>;
    if (business.category.slug === 'restaurantes') {
      const hoursText = String(values.openingHours || '');
      const openingHours = Object.fromEntries(hoursText.split(';').map((pair) => pair.split(':').map((part) => part.trim())).filter((parts) => parts.length >= 2 && parts[0]).map(([day, ...hours]) => [day, hours.join(':')]));
      body = { openingHours, closedDays: list('closedDays'), serviceOptions: list('serviceOptions'), paymentMethods: list('paymentMethods'), dietaryOptions: list('dietaryOptions'), atmosphere: values.atmosphere || null, capacity: values.capacity ? Number(values.capacity) : null, averageSpend: values.averageSpend ? Number(values.averageSpend) : null, reservationRequired: values.reservationRequired === 'on', accessibilityInfo: values.accessibilityInfo || null };
    } else {
      body = { durationMinutes: Number(values.durationMinutes), schedules: list('schedules'), meetingPoint: values.meetingPoint, minGroupSize: Number(values.minGroupSize || 1), maxGroupSize: values.maxGroupSize ? Number(values.maxGroupSize) : null, minAge: values.minAge ? Number(values.minAge) : null, maxAge: values.maxAge ? Number(values.maxAge) : null, included: list('included'), requirements: list('requirements'), physicalLevel: values.physicalLevel || 'Suave', languages: list('languages'), cancellationPolicy: values.cancellationPolicy, weatherPolicy: values.weatherPolicy || null, accessibilityInfo: values.accessibilityInfo || null };
    }
    try {
      const response = await apiFetch(`${API}/hotel-management/${business.id}/details`, { method: 'PUT', headers: { 'Content-Type': 'application/json', }, body: JSON.stringify(body) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error?.message || 'No se pudo guardar la ficha.');
      setManagedHotels((hotels) => hotels.map((hotel) => hotel.id === business.id ? { ...hotel, ...(business.category.slug === 'restaurantes' ? { restaurantDetail: result.data } : { tourDetail: result.data }) } : hotel));
    } catch (problem) { setHotelManagementError(problem instanceof Error ? problem.message : 'No se pudo guardar la ficha.'); }
    finally { setBusinessDetailSaving(null); }
  };

  const createCatalogItem = async (event: React.FormEvent<HTMLFormElement>, business: Business, kind: 'services' | 'menu-items') => {
    event.preventDefault(); const form = event.currentTarget; const values = Object.fromEntries(new FormData(form).entries());
    const body = { ...Object.fromEntries(Object.entries(values).filter(([,value]) => value !== '')), price: values.price ? Number(values.price) : null };
    const response = await apiFetch(`${API}/hotel-management/${business.id}/${kind}`, { method: 'POST', headers: { 'Content-Type': 'application/json', }, body: JSON.stringify(body) });
    const result = await response.json(); if (!response.ok) { setHotelManagementError(result.error?.message || 'No se pudo guardar.'); return; }
    setManagedHotels((hotels) => hotels.map((hotel) => hotel.id === business.id ? kind === 'services' ? { ...hotel, services: [...hotel.services, result.data] } : { ...hotel, menuItems: [...hotel.menuItems, result.data] } : hotel));
    form.reset();
  };

  const removeCatalogItem = async (business: Business, kind: 'services' | 'menu-items', itemId: string) => {
    const response = await apiFetch(`${API}/hotel-management/${business.id}/${kind}/${itemId}`, { method: 'DELETE', headers: { } });
    if (!response.ok) { const result = await response.json(); setHotelManagementError(result.error?.message || 'No se pudo eliminar.'); return; }
    setManagedHotels((hotels) => hotels.map((hotel) => hotel.id === business.id ? kind === 'services' ? { ...hotel, services: hotel.services.filter((item) => item.id !== itemId) } : { ...hotel, menuItems: hotel.menuItems.filter((item) => item.id !== itemId) } : hotel));
  };

  const deleteRoom = async (businessId: string, roomId: string) => {
    if (!window.confirm('¿Eliminar este tipo de habitación?')) return;
    const response = await apiFetch(`${API}/hotel-management/${businessId}/rooms/${roomId}`, { method: 'DELETE', headers: { } });
    if (response.ok) setManagedHotels((hotels) => hotels.map((hotel) => hotel.id === businessId ? { ...hotel, roomTypes: hotel.roomTypes.filter((room) => room.id !== roomId) } : hotel));
    else { const result = await response.json(); setHotelManagementError(result.error?.message || 'No se pudo eliminar el tipo de habitación.'); }
  };

  const closeAuth = () => {
    setAuthOpen(false);
    setAfterLoginAction('none');
    setPendingFavoriteId(null);
  };

  const continueFavoriteAuth = (mode: 'login' | 'register') => {
    if (authNotice === 'saved') {
      setAfterLoginAction('none');
      setPendingFavoriteId(null);
    }
    setAuthNotice(null);
    setAuthMode(mode);
    setGoogleError('');
    setAuthOpen(true);
  };

  const closeFavoritePrompt = () => {
    setAuthNotice(null);
    if (authNotice === 'favorite') {
      setAfterLoginAction('none');
      setPendingFavoriteId(null);
    }
  };

  useEffect(() => {
    if (!authNotice) return;
    const timeout = window.setTimeout(closeFavoritePrompt, 7000);
    return () => window.clearTimeout(timeout);
  }, [authNotice]);

  useEffect(() => {
    if (path !== '/galeria') return;
    let activeRequest = true;
    setGalleryLoading(true);
    setGalleryError('');
    const headers = sessionActive ? { } : undefined;
    const params = new URLSearchParams({ page: String(galleryPage), limit: '18', sort: gallerySort });
    if (galleryCategory !== 'Todas') params.set('category', galleryCategory);
    apiFetch(`${API}/gallery?${params.toString()}`, { headers }).then(async (response) => {
      if (!response.ok) throw new Error(`La API respondió ${response.status}`);
      return await response.json() as { data: GalleryPhoto[]; pagination: { total: number; totalPages: number; allTotal: number; categoryCounts: Record<string, number> } };
    }).then((result) => {
      if (!activeRequest) return;
      setGallery(result.data);
      setGalleryTotal(result.pagination.total);
      setGalleryTotalPages(Math.max(1, result.pagination.totalPages));
      setGalleryAllTotal(result.pagination.allTotal);
      setGalleryCategoryCounts(result.pagination.categoryCounts || {});
    })
      .catch(() => { if (activeRequest) setGalleryError('No se pudo cargar la galería. Intenta actualizar la página.'); })
      .finally(() => { if (activeRequest) setGalleryLoading(false); });
    return () => { activeRequest = false; };
  }, [path, sessionActive, gallerySort, galleryCategory, galleryPage, galleryRefresh]);

  // Solicita a Google el ID token y lo envía al backend, que valida firma, audiencia y vencimiento.
  useEffect(() => {
    if (!authOpen) return;
    let cancelled = false;
    let timeout = 0;
    const showGoogleButton = (clientId: string) => {
      const target = document.getElementById('google-signin-button');
      if (!target || !window.google || cancelled) return false;
      window.google.accounts.id.initialize({ client_id: clientId, callback: async ({ credential }) => {
        setGoogleError('');
        try {
          const response = await apiFetch(`${API}/auth/google`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ credential, accountType: authAccountType }) });
          const result = await response.json();
          if (!response.ok) throw new Error(result.error?.message || 'No se pudo iniciar sesión.');
          const { user } = result.data as { user: SignedInUser };
          await finishAuthentication(user, Number(result.data.idleTimeoutMs));
        } catch (loginError) {
          setGoogleError(loginError instanceof Error ? loginError.message : 'No se pudo iniciar sesión.');
        }
      } });
      window.google.accounts.id.renderButton(target, { theme: 'outline', size: 'large', shape: 'rectangular', text: 'continue_with', locale: 'es', width: 320 });
      return true;
    };
    getData<{ clientId: string | null }>('/auth/google/config').then(({ clientId }) => {
      if (!clientId) throw new Error('El inicio con Google aún no está configurado. Añade el Client ID web en GOOGLE_CLIENT_ID para habilitarlo.');
      if (showGoogleButton(clientId)) return;
      const onGoogleReady = () => { if (!showGoogleButton(clientId)) setGoogleError('No se pudo cargar el botón de Google. Revisa tu conexión e inténtalo de nuevo.'); };
      window.addEventListener('google-id-loaded', onGoogleReady, { once: true });
      timeout = window.setTimeout(onGoogleReady, 8000);
    }).catch((loginError) => { if (!cancelled) setGoogleError(loginError instanceof Error ? loginError.message : 'No se pudo iniciar sesión.'); });
    return () => { cancelled = true; window.clearTimeout(timeout); };
  }, [authOpen, afterLoginAction, pendingFavoriteId]);

  useEffect(() => {
    if (!photoFile) { setPhotoPreview(''); return; }
    const preview = URL.createObjectURL(photoFile);
    setPhotoPreview(preview);
    return () => URL.revokeObjectURL(preview);
  }, [photoFile]);

  const requestUpload = () => {
    setUploadError('');
    if (sessionActive) setUploadOpen(true);
    else { setAfterLoginAction('upload'); setGoogleError(''); setAuthMode('register'); setAuthOpen(true); }
  };

  const toggleGalleryLike = async (photo: GalleryPhoto) => {
    if (!sessionActive) {
      setAfterLoginAction('none');
      setAuthMode('login');
      setGoogleError('');
      setAuthOpen(true);
      return;
    }
    try {
      const response = await apiFetch(`${API}/gallery/${photo.id}/like`, {
        method: photo.likedByMe ? 'DELETE' : 'POST',
        headers: { },
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message || 'No se pudo actualizar el like.');
      const update = (item: GalleryPhoto) => item.id === photo.id ? { ...item, ...result.data } : item;
      setGallery((items) => items.map(update));
      setSelectedPhoto((item) => item ? update(item) : item);
    } catch (likeProblem) {
      setGalleryError(likeProblem instanceof Error ? likeProblem.message : 'No se pudo actualizar el like.');
    }
  };

  const submitTraditionalAuth = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthLoading(true);
    setGoogleError('');
    try {
      const response = await apiFetch(`${API}/auth/${authMode}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: authEmail, password: authPassword, ...(authMode === 'register' ? { fullName: authFullName, accountType: authAccountType } : {}) }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message || 'No se pudo acceder a la cuenta.');
      const { user } = result.data as { user: SignedInUser };
      await finishAuthentication(user, Number(result.data.idleTimeoutMs));
    } catch (authProblem) {
      setGoogleError(authProblem instanceof Error ? authProblem.message : 'No se pudo acceder a la cuenta.');
    } finally { setAuthLoading(false); }
  };

  const submitPhoto = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!photoFile || !sessionActive) return;
    setUploading(true);
    setUploadError('');
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('No se pudo leer la imagen.'));
        reader.onerror = () => reject(new Error('No se pudo leer la imagen.'));
        reader.readAsDataURL(photoFile);
      });
      const imageBase64 = dataUrl.split(',')[1] || '';
      const response = await apiFetch(`${API}/gallery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', },
        body: JSON.stringify({ caption, category: photoCategory, location: photoLocation.trim() || 'Puerto Escondido', mimeType: photoFile.type, originalName: photoFile.name, imageBase64 }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message || 'No se pudo publicar la foto.');
      const uploadedPhoto = result.data as GalleryPhoto; setGalleryPage(1); setGalleryCategory(uploadedPhoto.category); setGalleryRefresh((version) => version + 1);
      setPhotoFile(null);
      setCaption('');
      setPhotoCategory('Playas y mar');
      setPhotoLocation('');
      setUploadOpen(false);
    } catch (uploadProblem) {
      setUploadError(uploadProblem instanceof Error ? uploadProblem.message : 'No se pudo publicar la foto.');
    } finally { setUploading(false); }
  };

  const signOut = () => {
    void apiFetch(`${API}/auth/logout`, { method: 'POST' });
    setSessionActive(false);
    setCurrentUser(null);
    setSaved([]);
  };

  const filtered = useMemo(() => places.filter((place) => {
    if (place.category.slug === 'transportes') return false;
    const categoryMatches = active === 'Todo' || place.category.name === active;
    const searchable = `${place.name} ${place.zone} ${place.shortDescription} ${place.description} ${place.services.map((service) => service.name).join(' ')} ${place.menuItems.map((item) => item.name).join(' ')}`;
    return categoryMatches && searchable.toLowerCase().includes(query.toLowerCase());
  }), [places, active, query]);

  const showDropdown = (name: 'explore' | 'planner' | 'things') => {
    setOpenDropdown(name);
    setPinnedDropdown((current) => current && current !== name ? null : current);
  };
  const leaveDropdown = (name: 'explore' | 'planner' | 'things') => {
    if (pinnedDropdown !== name) setOpenDropdown((current) => current === name ? null : current);
  };
  const toggleDropdown = (name: 'explore' | 'planner' | 'things') => {
    if (pinnedDropdown === name) {
      setPinnedDropdown(null);
      setOpenDropdown(null);
    } else {
      setPinnedDropdown(name);
      setOpenDropdown(name);
    }
  };
  const closeDropdowns = () => { setOpenDropdown(null); setPinnedDropdown(null); };
  const link = (to: string, label: React.ReactNode, className?: string) => <a className={className} href={to} onClick={(event) => { event.preventDefault(); go(to); setMenu(false); closeDropdowns(); }}>{label}</a>;
  const municipalityLink = () => link('/municipio', <>Conoce Puerto Escondido <span>→</span></>, 'dark-btn');
  const zoneOptions = catalogZones.length ? catalogZones : [...new Set(places.map((place) => place.zone).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'));
  const advancedFilterCount = Number(Boolean(priceMin || priceMax)) + Number(Boolean(locationType)) + Number(Boolean(locationZone)) + selectedFeatures.length;
  const clearAdvancedFilters = () => { setPriceMin(''); setPriceMax(''); setLocationType(''); setLocationZone(''); setSelectedFeatures([]); setCatalogPage(1); };
  const directorySearchUrl = () => {
    const params = new URLSearchParams();
    if (query.trim()) params.set('search', query.trim());
    if (active !== 'Todo') params.set('categoria', active);
    if (priceMin) params.set('minPrice', priceMin);
    if (priceMax) params.set('maxPrice', priceMax);
    if (locationType) params.set('zoneType', locationType);
    if (locationZone) params.set('zone', locationZone);
    if (selectedFeatures.length) params.set('features', selectedFeatures.join(','));
    return `/lugares${params.size ? `?${params.toString()}` : ''}`;
  };
  const advancedFilterPanel = <div className="advanced-filter-panel">
    <div className="advanced-filter-heading"><div><b>Afina tu búsqueda</b><small>Precios en pesos colombianos · comodidades reportadas por el alojamiento</small></div>{advancedFilterCount > 0 && <button type="button" onClick={clearAdvancedFilters}>Limpiar filtros</button>}</div>
    <div className="advanced-filter-fields">
      <fieldset className="advanced-price-filter"><legend>Rango de precio</legend><label>Desde<input type="number" min="0" step="5000" inputMode="numeric" value={priceMin} onChange={(event) => { const next = event.target.value; setPriceMin(next); if (priceMax && next && Number(priceMax) < Number(next)) setPriceMax(''); setCatalogPage(1); }} placeholder="$ 0"/></label><span aria-hidden="true">—</span><label>Hasta<input type="number" min={priceMin || 0} step="5000" inputMode="numeric" value={priceMax} onChange={(event) => { const next = event.target.value; setPriceMax(next); if (priceMin && next && Number(priceMin) > Number(next)) setPriceMin(next); setCatalogPage(1); }} placeholder="Sin límite"/></label></fieldset>
      <label className="advanced-select-filter">Zona general<select value={locationType} onChange={(event) => { setLocationType(event.target.value); setCatalogPage(1); }}><option value="">Todas</option><option value="urban">Zona urbana</option><option value="rural">Zona rural</option><option value="beach">Playas y mar</option></select></label>
      <label className="advanced-select-filter">Localidad<select value={locationZone} onChange={(event) => { setLocationZone(event.target.value); setCatalogPage(1); }}><option value="">Todas</option>{zoneOptions.map((zone) => <option key={zone} value={zone}>{zone}</option>)}</select></label>
      <fieldset className="advanced-feature-filter"><legend>Características</legend>{[['pets', 'Admite mascotas'], ['air-conditioning', 'Aire acondicionado'], ['parking', 'Parqueadero']].map(([feature, label]) => <label key={feature}><input type="checkbox" checked={selectedFeatures.includes(feature)} onChange={(event) => { setSelectedFeatures((current) => event.target.checked ? [...current, feature] : current.filter((item) => item !== feature)); setCatalogPage(1); }}/>{label}</label>)}</fieldset>
    </div>
  </div>;
  const mediaSource = (place: Business, media: Business['media'][number]) => media.imageUrl
    ? (media.imageUrl.startsWith('http')
      ? media.imageUrl.includes('images.unsplash.com')
        ? (place.category.slug === 'hoteles' ? destinationPhotos.lodging
          : place.category.slug === 'restaurantes' ? destinationPhotos.dining
            : place.category.slug === 'transportes' ? destinationPhotos.town
              : [destinationPhotos.pier, destinationPhotos.coast, destinationPhotos.beach][Math.max(0, place.media.indexOf(media)) % 3])
        : media.imageUrl
      : apiImage(media.imageUrl))
    : `${API}/businesses/${place.id}/media/${media.id}/image`;
  const openPlaceDetails = (place: Business) => { setSelectedPlace(place); setActivePlaceImage(0); setPreviousPlaceImage(null); setStaySearch({ checkIn: '', checkOut: '', adults: 2, children: 0, rooms: 1 }); };
  const moveCardImage = (businessId: string, imageCount: number, step: number) => {
    setCardImageIndices((current) => ({ ...current, [businessId]: ((current[businessId] || 0) + step + imageCount) % imageCount }));
  };
  const changePlaceImage = (index: number, photos: Business['media']) => {
    if (!selectedPlace || index === activePlaceImage) return;
    const currentPhoto = photos[Math.min(activePlaceImage, photos.length - 1)];
    setPreviousPlaceImage(currentPhoto ? mediaSource(selectedPlace, currentPhoto) : picture());
    setActivePlaceImage(index);
  };
  const handleCardSwipe = (event: React.TouchEvent<HTMLDivElement>, businessId: string, imageCount: number) => {
    const start = swipeStartX.current;
    const end = event.changedTouches[0]?.clientX;
    if (start !== null && end !== undefined && Math.abs(end - start) > 45 && imageCount > 1) {
      event.preventDefault();
      moveCardImage(businessId, imageCount, end < start ? 1 : -1);
    }
    swipeStartX.current = null;
  };
  const handlePlaceSwipe = (event: React.TouchEvent<HTMLDivElement>, photos: Business['media']) => {
    const start = swipeStartX.current;
    const end = event.changedTouches[0]?.clientX;
    if (start !== null && end !== undefined && Math.abs(end - start) > 45 && photos.length > 1) {
      changePlaceImage((activePlaceImage + (end < start ? 1 : -1) + photos.length) % photos.length, photos);
    }
    swipeStartX.current = null;
  };
  const card = (place: Business) => {
    const cover = place.media.find((media) => media.isCover) || place.media[0];
    const imageIndex = (cardImageIndices[place.id] || 0) % Math.max(place.media.length, 1);
    const activeMedia = place.media[imageIndex] || cover;
    const highlights = [...(place.accommodation?.amenities || []), ...place.services.map((service) => service.name)].slice(0, 3);
    const whatsappDigits = String(place.whatsappNumber || '').replace(/\D/g, '');
    const whatsappPhone = whatsappDigits.startsWith('57') ? whatsappDigits : whatsappDigits.length === 10 ? `57${whatsappDigits}` : whatsappDigits;
    const whatsappUrl = whatsappPhone.length >= 10 ? `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(`Hola, vi ${place.name} en el directorio de Puerto Escondido y quisiera recibir información.`)}` : null;
    const coordinates = place.latitude != null && place.longitude != null && String(place.latitude).trim() && String(place.longitude).trim() ? `${place.latitude},${place.longitude}` : null;
    const directionsUrl = coordinates ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(coordinates)}` : null;
    return <article className="card place-card" key={place.id}>
      <div className="card-image" onTouchStart={(event) => {swipeStartX.current = event.touches[0]?.clientX ?? null;}} onTouchEnd={(event) => handleCardSwipe(event, place.id, place.media.length)}><button className="card-photo-button" onClick={() => openPlaceDetails(place)} aria-label={`Ver detalles de ${place.name}`}><img key={activeMedia?.id || 'fallback'} className="card-image-transition" src={activeMedia ? mediaSource(place, activeMedia) : picture()} alt={`${place.name} · foto ${imageIndex + 1}`} loading="lazy"/></button><span className="tag">{place.category.name.toUpperCase()}</span>{place.isVerified && <span className="verified-tag">✓ Verificado</span>}{place.media.length > 1 && <><button className="card-gallery-arrow previous" onClick={(event) => {event.stopPropagation();moveCardImage(place.id, place.media.length, -1);}} aria-label={`Foto anterior de ${place.name}`}>‹</button><button className="card-gallery-arrow next" onClick={(event) => {event.stopPropagation();moveCardImage(place.id, place.media.length, 1);}} aria-label={`Foto siguiente de ${place.name}`}>›</button><span className="photo-count">{imageIndex + 1} / {place.media.length}</span></>}<button className={saved.includes(place.id) ? 'heart chosen' : 'heart'} aria-label={saved.includes(place.id) ? 'Quitar de favoritos' : 'Guardar favorito'} title={sessionActive ? (saved.includes(place.id) ? 'Quitar de guardados' : 'Guardar en favoritos') : 'Inicia sesión para guardar'} onClick={() => void toggleFavorite(place.id)}>{saved.includes(place.id) ? '♥' : '♡'}</button></div>
      <div className="card-body"><div className="card-top"><span>{place.category.name.toUpperCase()} · {place.zone.toUpperCase()}</span><span className="card-location">⌖ Puerto Escondido</span></div><button className="place-name-button" onClick={() => openPlaceDetails(place)}><h3>{place.name}</h3></button><p>{place.shortDescription}</p>
        {!!highlights.length && <div className="place-chips">{highlights.map((highlight) => <span key={highlight}>✦ {highlight}</span>)}</div>}
        {(whatsappUrl || directionsUrl) && <div className="place-quick-actions">{whatsappUrl && <a className="place-quick-action whatsapp" href={whatsappUrl} target="_blank" rel="noreferrer" aria-label={`Contactar a ${place.name} por WhatsApp`}>WhatsApp <span aria-hidden="true">↗</span></a>}{directionsUrl && <a className="place-quick-action directions" href={directionsUrl} target="_blank" rel="noreferrer" aria-label={`Cómo llegar a ${place.name}`}>Cómo llegar <span aria-hidden="true">↗</span></a>}</div>}
        <div className="card-bottom place-card-bottom"><span><small>Desde</small><br/><b>{money(place.basePrice)}</b><small> / {place.priceUnit || 'servicio'}</small></span><button className="card-details-button" onClick={() => openPlaceDetails(place)}>Ver detalles <span>→</span></button></div>
      </div>
    </article>;
  };

  const placeDetail = selectedPlace && (() => {
    const photos = selectedPlace.media.length ? selectedPlace.media : [{ id: 'fallback', imageUrl: null, mimeType: null, isCover: true, displayOrder: 0 }];
    const photo = photos[Math.min(activePlaceImage, photos.length - 1)];
    const activeImageUrl = photo.id === 'fallback' ? picture() : mediaSource(selectedPlace, photo);
    const coordinates = selectedPlace.latitude && selectedPlace.longitude ? `${selectedPlace.latitude},${selectedPlace.longitude}` : null;
    return <div className="modal-backdrop place-detail-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedPlace(null); }}><section className="place-detail-modal" role="dialog" aria-modal="true" aria-labelledby="place-detail-title"><button className="modal-close" onClick={() => setSelectedPlace(null)} aria-label="Cerrar detalles">×</button><div className="place-detail-gallery" onTouchStart={(event) => {swipeStartX.current = event.touches[0]?.clientX ?? null;}} onTouchEnd={(event) => handlePlaceSwipe(event, photos)}>{previousPlaceImage && <img className="detail-gallery-image outgoing" src={previousPlaceImage} alt="" aria-hidden="true" onAnimationEnd={(event) => {if(event.animationName === 'galleryFadeOut')setPreviousPlaceImage(null);}}/>}<img key={activeImageUrl} className="detail-gallery-image incoming" src={activeImageUrl} alt={`${selectedPlace.name} · foto ${activePlaceImage + 1}`} /><span className="detail-photo-count">{activePlaceImage + 1} / {photos.length}</span>{photos.length > 1 && <><button className="gallery-arrow previous" onClick={() => changePlaceImage((activePlaceImage - 1 + photos.length) % photos.length, photos)} aria-label="Foto anterior">‹</button><button className="gallery-arrow next" onClick={() => changePlaceImage((activePlaceImage + 1) % photos.length, photos)} aria-label="Foto siguiente">›</button></>}{photos.length > 1 && <div className="place-thumbnails">{photos.map((item, index) => <button key={item.id} className={index === activePlaceImage ? 'active' : ''} onClick={() => changePlaceImage(index, photos)} aria-label={`Ver foto ${index + 1}`}><img src={item.id === 'fallback' ? picture() : mediaSource(selectedPlace, item)} alt=""/></button>)}</div>}</div><div className="place-detail-content"><div className="place-detail-heading"><div><span className="eyebrow">{selectedPlace.category.name.toUpperCase()} · {selectedPlace.zone.toUpperCase()}</span><h2 id="place-detail-title">{selectedPlace.name}</h2><p>{selectedPlace.address}</p></div><div className="detail-price"><small>Desde</small><b>{money(selectedPlace.basePrice)}</b><small> / {selectedPlace.priceUnit || 'servicio'}</small></div></div><p className="place-full-description">{selectedPlace.description}</p>{selectedPlace.accommodation ? <section className="detail-section"><h3>Comodidades y normas</h3>{selectedPlace.accommodation.amenities.length > 0 ? <div className="place-chips">{selectedPlace.accommodation.amenities.map((amenity) => <span key={amenity}>✦ {amenity}</span>)}</div> : <p className="detail-extra">El establecimiento aún no ha indicado comodidades.</p>}{(selectedPlace.accommodation.checkInTime || selectedPlace.accommodation.checkOutTime || selectedPlace.accommodation.maxGuestsPerUnit) && <p className="detail-extra">{selectedPlace.accommodation.maxGuestsPerUnit ? `Hasta ${selectedPlace.accommodation.maxGuestsPerUnit} huéspedes por habitación` : ''}{selectedPlace.accommodation.checkInTime ? ` · Entrada desde ${selectedPlace.accommodation.checkInTime}` : ''}{selectedPlace.accommodation.checkOutTime ? ` · Salida hasta ${selectedPlace.accommodation.checkOutTime}` : ''}</p>}<p className="detail-extra">{selectedPlace.accommodation.smokingAllowed ? 'Se permite fumar' : 'No se permite fumar'} · {selectedPlace.accommodation.eventsAllowed ? 'Se permiten eventos' : 'No se permiten eventos'} · {selectedPlace.accommodation.petsPolicy === 'ALLOWED' ? 'Admite mascotas' : selectedPlace.accommodation.petsPolicy === 'ON_REQUEST' ? 'Mascotas bajo petición' : 'No admite mascotas'}</p></section> : null}{selectedPlace.restaurantDetail && <section className="detail-section business-facts"><h3>Información del restaurante</h3>{selectedPlace.restaurantDetail.openingHours && Object.keys(selectedPlace.restaurantDetail.openingHours).length > 0 && <div className="fact-block"><b>Horarios</b>{Object.entries(selectedPlace.restaurantDetail.openingHours).map(([day,hours]) => <span key={day}>{day}: {hours}</span>)}</div>}{selectedPlace.restaurantDetail.closedDays.length > 0 && <p><b>Días de cierre:</b> {selectedPlace.restaurantDetail.closedDays.join(', ')}</p>}{selectedPlace.restaurantDetail.atmosphere && <p><b>Ambiente:</b> {selectedPlace.restaurantDetail.atmosphere}</p>}{selectedPlace.restaurantDetail.capacity && <p><b>Capacidad:</b> {selectedPlace.restaurantDetail.capacity} personas</p>}{selectedPlace.restaurantDetail.averageSpend && <p><b>Consumo promedio:</b> {money(selectedPlace.restaurantDetail.averageSpend)} por persona</p>}<p><b>Reservas:</b> {selectedPlace.restaurantDetail.reservationRequired ? 'Recomendadas o necesarias' : 'No obligatorias'}</p>{selectedPlace.restaurantDetail.serviceOptions.length > 0 && <p><b>Servicios:</b> {selectedPlace.restaurantDetail.serviceOptions.join(' · ')}</p>}{selectedPlace.restaurantDetail.paymentMethods.length > 0 && <p><b>Medios de pago:</b> {selectedPlace.restaurantDetail.paymentMethods.join(' · ')}</p>}{selectedPlace.restaurantDetail.dietaryOptions.length > 0 && <p><b>Opciones de alimentación:</b> {selectedPlace.restaurantDetail.dietaryOptions.join(' · ')}</p>}{selectedPlace.restaurantDetail.accessibilityInfo && <p><b>Accesibilidad:</b> {selectedPlace.restaurantDetail.accessibilityInfo}</p>}</section>}{selectedPlace.tourDetail && <section className="detail-section business-facts"><h3>Detalles de la experiencia</h3><div className="place-chips"><span>◷ {Math.floor(selectedPlace.tourDetail.durationMinutes / 60)} h {selectedPlace.tourDetail.durationMinutes % 60 ? `${selectedPlace.tourDetail.durationMinutes % 60} min` : ''}</span><span>♙ Grupo de {selectedPlace.tourDetail.minGroupSize}{selectedPlace.tourDetail.maxGroupSize ? `–${selectedPlace.tourDetail.maxGroupSize}` : '+'} personas</span><span>⌖ {selectedPlace.tourDetail.meetingPoint}</span><span>◎ Esfuerzo {selectedPlace.tourDetail.physicalLevel}</span>{(selectedPlace.tourDetail.minAge || selectedPlace.tourDetail.maxAge) && <span>Edad {selectedPlace.tourDetail.minAge ?? 0}–{selectedPlace.tourDetail.maxAge ?? 'sin límite'}</span>}</div>{selectedPlace.tourDetail.schedules.length > 0 && <p><b>Salidas:</b> {selectedPlace.tourDetail.schedules.join(' · ')}</p>}{selectedPlace.tourDetail.languages.length > 0 && <p><b>Idiomas:</b> {selectedPlace.tourDetail.languages.join(' · ')}</p>}{selectedPlace.tourDetail.included.length > 0 && <p><b>Incluye:</b> {selectedPlace.tourDetail.included.join(' · ')}</p>}{selectedPlace.tourDetail.requirements.length > 0 && <p><b>Recomendaciones:</b> {selectedPlace.tourDetail.requirements.join(' · ')}</p>}<p><b>Cancelación:</b> {selectedPlace.tourDetail.cancellationPolicy}</p>{selectedPlace.tourDetail.weatherPolicy && <p><b>Clima:</b> {selectedPlace.tourDetail.weatherPolicy}</p>}{selectedPlace.tourDetail.accessibilityInfo && <p><b>Accesibilidad:</b> {selectedPlace.tourDetail.accessibilityInfo}</p>}</section>}{selectedPlace.roomTypes?.length > 0 && <section className="detail-section hotel-rooms"><div className="hotel-rooms-heading"><div><span className="eyebrow">DESCANSO A TU MEDIDA</span><h3>Habitaciones</h3></div><span>{selectedPlace.roomTypes.length} opciones</span></div><div className="room-search"><label>Entrada<input type="date" min={new Date().toISOString().slice(0,10)} value={staySearch.checkIn} onChange={(e) => setStaySearch({...staySearch,checkIn:e.target.value,checkOut:staySearch.checkOut && staySearch.checkOut <= e.target.value ? '' : staySearch.checkOut})}/> </label><label>Salida<input type="date" min={staySearch.checkIn || new Date().toISOString().slice(0,10)} value={staySearch.checkOut} onChange={(e) => setStaySearch({...staySearch,checkOut:e.target.value})}/> </label><label>Adultos<select value={staySearch.adults} onChange={(e) => setStaySearch({...staySearch,adults:Number(e.target.value)})}>{Array.from({length: 10}, (_, i) => i + 1).map(n => <option key={n} value={n}>{n}</option>)}</select></label><label>Niños<select value={staySearch.children} onChange={(e) => setStaySearch({...staySearch,children:Number(e.target.value)})}>{Array.from({length: 8}, (_, i) => i).map(n => <option key={n} value={n}>{n}</option>)}</select></label><label>Habitaciones<select value={staySearch.rooms} onChange={(e) => setStaySearch({...staySearch,rooms:Number(e.target.value)})}>{Array.from({length: 6}, (_, i) => i + 1).map(n => <option key={n} value={n}>{n}</option>)}</select></label></div><div className="room-list">{selectedPlace.roomTypes.filter((room) => room.isAvailable && room.maxAdults >= staySearch.adults && room.maxChildren >= staySearch.children && room.quantity >= staySearch.rooms).map((room) => <article className="room-card" key={room.id}><div className="room-card-main"><div className="room-card-title"><h4>{room.name}</h4><span>{room.quantity} {room.quantity === 1 ? 'unidad' : 'unidades'}</span></div><p>{room.description}</p><div className="room-facts"><span>♙ {room.maxAdults} adultos · {room.maxChildren} niños</span><span>▱ {room.bedDescription}</span>{room.areaSqm && <span>◫ {room.areaSqm} m²</span>}</div>{room.amenities.length > 0 && <div className="place-chips">{room.amenities.map(item => <span key={item}>✦ {item}</span>)}</div>}<div className="room-policy"><span>{room.breakfastIncluded ? '☕ Desayuno incluido' : 'Desayuno no incluido'}</span><span>{room.refundable ? `↩ ${room.cancellationPolicy}` : 'No reembolsable'}</span><span>◇ {room.prepaymentPolicy}</span></div></div><div className="room-price"><small>Desde · noche</small><b>{money(room.nightlyRate)}</b><span>Impuestos pueden aplicar</span><button className="dark-btn" type="button" onClick={() => openQuickInquiry(room.name)}>Consultar habitación →</button></div></article>)}</div><p className="detail-extra">Las fechas y ocupación se usan para facilitar tu consulta. La confirmación de disponibilidad la realiza el establecimiento.</p></section>}{selectedPlace.services.length > 0 && <section className="detail-section"><h3>Servicios</h3><div className="detail-offers">{selectedPlace.services.map((service) => <article key={service.id}><div><b>{service.name}</b>{service.description && <p>{service.description}</p>}</div><strong>{money(service.price)}{service.priceUnit ? ` / ${service.priceUnit}` : ''}</strong></article>)}</div></section>}{selectedPlace.menuItems.length > 0 && <section className="detail-section"><h3>Menú</h3><div className="detail-offers">{selectedPlace.menuItems.map((item) => <article key={item.id}><div className="menu-item-info">{item.imageUrl && <img src={item.imageUrl} alt={item.name} loading="lazy"/>}<div><b>{item.name}</b>{item.description && <p>{item.description}</p>}{item.category && <small>{item.category}</small>}</div></div><strong>{money(item.price)}</strong></article>)}</div></section>}<div className="place-detail-actions">{coordinates && <a className="outline-btn" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(coordinates)}`} target="_blank" rel="noreferrer">Ver ubicación ↗</a>}{selectedPlace.instagramUrl && <a className="outline-btn" href={selectedPlace.instagramUrl} target="_blank" rel="noreferrer">Instagram ↗</a>}<button className="dark-btn" type="button" onClick={() => openQuickInquiry()}>{selectedPlace.category.slug === 'hoteles' ? 'Cotizar / Reservar por WhatsApp ↗' : selectedPlace.category.slug === 'restaurantes' ? 'Reservar por WhatsApp ↗' : selectedPlace.category.slug === 'transportes' ? 'Consultar transporte por WhatsApp ↗' : 'Consultar tour por WhatsApp ↗'}</button></div></div></section></div>;
  })();

  const inquiryDialog = inquiryOpen && selectedPlace && <div className="modal-backdrop quick-inquiry-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !inquiryBusy) setInquiryOpen(false); }}>
    <section className="quick-inquiry-modal" role="dialog" aria-modal="true" aria-labelledby="quick-inquiry-title">
      <button className="modal-close" type="button" onClick={() => setInquiryOpen(false)} aria-label="Cerrar solicitud" disabled={inquiryBusy}>×</button>
      <span className="eyebrow">PUERTO ESCONDIDO · CONSULTA DIRECTA</span>
      <h2 id="quick-inquiry-title">Hablemos de tu visita.</h2>
      <p className="quick-inquiry-intro">Comparte estos datos. Guardaremos tu solicitud y luego abriremos WhatsApp con el mensaje listo.</p>
      <form onSubmit={submitQuickInquiry}>
        <label>Tu nombre<input required minLength={2} maxLength={150} autoComplete="name" value={inquiryName} onChange={(event) => setInquiryName(event.target.value)} placeholder="Ej. Carlos Pérez"/></label>
        {selectedPlace.category.slug === 'hoteles' ? <div className="quick-inquiry-dates"><label>Entrada<input required type="date" value={inquiryVisitDate} onChange={(event) => setInquiryVisitDate(event.target.value)} min={new Date().toISOString().slice(0, 10)}/></label><label>Salida<input required type="date" value={inquiryCheckOut} onChange={(event) => setInquiryCheckOut(event.target.value)} min={inquiryVisitDate || new Date().toISOString().slice(0, 10)}/></label></div> : <label>Fecha de visita<input required type="date" value={inquiryVisitDate} onChange={(event) => setInquiryVisitDate(event.target.value)} min={new Date().toISOString().slice(0, 10)}/></label>}
        <label>Número de personas<input required type="number" min="1" max="30" value={inquiryGuests} onChange={(event) => setInquiryGuests(Number(event.target.value))}/></label>
        <label>Teléfono de contacto <span>(opcional)</span><input type="tel" autoComplete="tel" maxLength={30} value={inquiryPhone} onChange={(event) => setInquiryPhone(event.target.value)} placeholder="Tu número de contacto"/></label>
        {inquiryError && <p className="quick-inquiry-error" role="alert">{inquiryError}</p>}
        <button className="dark-btn quick-inquiry-submit" type="submit" disabled={inquiryBusy}>{inquiryBusy ? 'Guardando solicitud…' : 'Continuar a WhatsApp'} <span>→</span></button>
        <small>Tu consulta se guarda en la plataforma antes de salir a WhatsApp. No necesitas registrarte.</small>
      </form>
    </section>
  </div>;

  const exploreOption = (to: string, title: string, subtitle: string, image: string) => link(to, <><img className="dropdown-option-image" src={image} alt="" loading="lazy"/><span className="option-copy"><b>{title}</b><small>{subtitle}</small></span><span className="option-arrow" aria-hidden="true">↗</span></>, 'dropdown-option');
  const navSectionLink = (to: string, id: string, title: string, image: string) => <a className="things-menu-option" href={`${to}#${id}`} onClick={(event) => { event.preventDefault(); go(to); window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }), 180); setMenu(false); closeDropdowns(); }}><img src={image} alt="" loading="lazy"/><span>{title}</span><b>↗</b></a>;
  const authToast = authNotice && <aside className="auth-toast" role="status" aria-live="polite"><span className="auth-toast-icon">i</span><div className="auth-toast-content"><p>{authNotice === 'favorite' ? <>Para guardar este lugar, debes <b>iniciar sesión</b> o crear una cuenta.</> : <>Para ver tus guardados, debes <b>iniciar sesión</b> o registrarte.</>}</p><div className="auth-toast-actions"><button onClick={() => continueFavoriteAuth('login')}>Iniciar sesión</button><span>·</span><button onClick={() => continueFavoriteAuth('register')}>Registrarme</button></div></div><button className="auth-toast-close" onClick={closeFavoritePrompt} aria-label="Cerrar aviso">×</button><span className="auth-toast-timer"/></aside>;  const authDialog = authOpen && <div className="modal-backdrop" onMouseDown={(event) => {if(event.target === event.currentTarget)closeAuth();}}><section className="community-modal auth-modal" role="dialog" aria-modal="true" aria-labelledby="google-title"><button className="modal-close" onClick={closeAuth} aria-label="Cerrar">×</button><span className="modal-mark">P.</span><span className="eyebrow">{afterLoginAction === 'business' ? 'RED DE ANFITRIONES' : 'COMUNIDAD PUERTO'}</span><h2 id="google-title">{afterLoginAction === 'business' ? 'Publica lo que haces.' : 'Entra a la comunidad.'}</h2><p>{afterLoginAction === 'business' ? 'Crea tu cuenta de anfitrión para registrar hoteles, restaurantes o experiencias de Puerto Escondido.' : 'Inicia sesión para guardar tus lugares favoritos y compartir fotos con la comunidad.'}</p><div className="google-button-wrap"><div id="google-signin-button"/></div><div className="auth-divider"><span>O CONTINÚA CON TU CORREO</span></div><div className="auth-tabs"><button type="button" className={authMode === 'login' ? 'active' : ''} onClick={() => {setAuthMode('login');setGoogleError('');}}>Iniciar sesión</button><button type="button" className={authMode === 'register' ? 'active' : ''} onClick={() => {setAuthMode('register');setAuthAccountType(afterLoginAction === 'business' ? 'BUSINESS_OWNER' : authAccountType);setGoogleError('');}}>Crear cuenta</button></div><form className="auth-form" onSubmit={submitTraditionalAuth}>{authMode === 'register' && <><label>Nombre completo<input type="text" autoComplete="name" minLength={2} maxLength={150} required value={authFullName} onChange={(event) => setAuthFullName(event.target.value)} placeholder="Tu nombre"/></label>{afterLoginAction !== 'business' && <label>Tipo de cuenta<select value={authAccountType} onChange={(event) => setAuthAccountType(event.target.value as 'TOURIST' | 'BUSINESS_OWNER')}><option value="TOURIST">Viajero</option><option value="BUSINESS_OWNER">Anfitrión · hoteles, restaurantes y tours</option></select></label>}</>}<label>Correo electrónico<input type="email" autoComplete="email" required value={authEmail} onChange={(event) => setAuthEmail(event.target.value)} placeholder="tu@correo.com"/></label><label>Contraseña<input type="password" autoComplete={authMode === 'register' ? 'new-password' : 'current-password'} minLength={authMode === 'register' ? 8 : 1} maxLength={72} required value={authPassword} onChange={(event) => setAuthPassword(event.target.value)} placeholder={authMode === 'register' ? 'Mínimo 8 caracteres' : 'Tu contraseña'}/></label>{googleError && <p className="modal-error">{googleError}</p>}<button className="dark-btn auth-submit" type="submit" disabled={authLoading}>{authLoading ? 'Un momento…' : authMode === 'register' ? 'Crear cuenta' : 'Iniciar sesión'} <span>→</span></button></form><small>{afterLoginAction === 'business' ? 'Esta cuenta se creará como anfitrión. Tu negocio pasará a revisión antes de publicarse.' : 'Tu nombre aparecerá junto a las fotos que publiques.'}</small></section></div>;
  const navLink = (to: string, label: string) => link(to, <span>{label}</span>, `nav-link${path === to ? ' active-nav' : ''}`);
  const header = <><div className="announcement"><span>✦</span> Caribe de Córdoba · naturaleza, cultura y mar <i>—</i> Puerto Escondido</div><header className="nav destination-nav">
    <div className="nav-scroll-progress" role="progressbar" aria-label="Progreso de lectura" aria-valuemin={0} aria-valuemax={100} aria-valuenow={0}><span ref={scrollProgressRef}/></div>
    <a className="brand group" href="/" onClick={(event) => { event.preventDefault(); go('/'); setMenu(false); closeDropdowns(); }}><span className="brand-mark">P.</span><span>PUERTO<br/><small>ESCONDIDO</small></span></a>
    <button className="mobile-menu" onClick={() => { if (menu) closeDropdowns(); setMenu(!menu); }} aria-label={menu ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={menu} aria-controls="primary-navigation"><span/><span/><span/></button>
    <nav id="primary-navigation" className={menu ? 'open' : ''} onKeyDown={(event) => { if (event.key === 'Escape') closeDropdowns(); }}>
      <details className="nav-dropdown" open={openDropdown === 'explore'} onMouseEnter={() => showDropdown('explore')} onMouseLeave={() => leaveDropdown('explore')}>
        <summary onClick={(event) => { event.preventDefault(); toggleDropdown('explore'); }} aria-expanded={openDropdown === 'explore'}><span>Directorio</span><NavIcon name="chevron" className="nav-chevron h-3 w-3"/></summary>
        <div className="dropdown-panel destination-explore-panel"><div className="dropdown-main"><div className="dropdown-heading"><div><span>COMERCIOS VERIFICADOS</span><b>Reserva o cotiza por WhatsApp</b></div><small className="dropdown-location">Puerto Escondido, Córdoba</small></div><div className="dropdown-options">
          {exploreOption('/lugares','Todos los lugares','Alojamientos, sabores y más',destinationPhotos.town)}
          {exploreOption('/lugares?categoria=Hoteles','Hoteles y cabañas','Descansa cerca del Caribe',destinationPhotos.lodging)}
          {exploreOption('/lugares?categoria=Restaurantes','Restaurantes y sabores','Sabores de la costa',destinationPhotos.dining)}
          {exploreOption('/lugares?categoria=Tours','Tours y experiencias','Explora con gente local',destinationPhotos.pier)}
        </div></div><aside className="dropdown-feature" style={{backgroundImage: "linear-gradient(180deg,rgba(14,51,40,.18),rgba(12,46,37,.95)),url(" + picture(town?.coverImageUrl) + ")"}}><span className="dropdown-feature-tag">NEGOCIOS LOCALES</span><h3>Encuentra tu<br/><em>próximo plan.</em></h3><p>Consulta opciones publicadas por comercios del municipio.</p>{link('/lugares','Ver directorio ↗','dropdown-map-link')}</aside></div>
      </details>
      <details className="nav-dropdown things-dropdown" open={openDropdown === 'things'} onMouseEnter={() => showDropdown('things')} onMouseLeave={() => leaveDropdown('things')}>
        <summary onClick={(event) => { event.preventDefault(); toggleDropdown('things'); }} aria-expanded={openDropdown === 'things'}><span>Descubre</span><NavIcon name="chevron" className="nav-chevron h-3 w-3"/></summary>
        <div className="things-menu-panel"><span className="planner-menu-kicker">ATRACTIVOS Y AGENDA PÚBLICA</span>
          {navSectionLink('/que-hacer','playas','Playas y mar',destinationPhotos.coast)}
          {navSectionLink('/que-hacer','volcan','Volcán de Lodo y naturaleza',destinationPhotos.beach)}
          {navSectionLink('/municipio','cultura','Cultura y patrimonio',destinationPhotos.town)}
          {link('/eventos',<><img src={destinationPhotos.pier} alt=""/><span>Eventos y festivales</span><b>↗</b></>,'things-menu-option')}
        </div>
      </details>
      <details className="nav-dropdown planner-dropdown things-dropdown" open={openDropdown === 'planner'} onMouseEnter={() => showDropdown('planner')} onMouseLeave={() => leaveDropdown('planner')}>
        <summary onClick={(event) => { event.preventDefault(); toggleDropdown('planner'); }} aria-expanded={openDropdown === 'planner'}><span>Planea tu viaje</span><NavIcon name="chevron" className="nav-chevron h-3 w-3"/></summary>
        <div className="things-menu-panel"><span className="planner-menu-kicker">GUÍA LOGÍSTICA DEL VISITANTE</span>
          {link('/planea-tu-viaje',<><img src={destinationPhotos.pier} alt=""/><span>Armar mi itinerario</span><b>↗</b></>,'things-menu-option')}
          {link('/transportes',<><img src={destinationPhotos.town} alt=""/><span>Cómo llegar y transporte</span><b>↗</b></>,'things-menu-option')}
          {link('/mapa',<><img src={destinationPhotos.coast} alt="Vista de la costa de Puerto Escondido" loading="lazy"/><span>Mapa interactivo</span><b>↗</b></>,'things-menu-option')}
          {navSectionLink('/planea-tu-viaje','recomendaciones','Recomendaciones y clima',destinationPhotos.beach)}
        </div>
      </details>
      {navLink('/municipio','El municipio')}
      {navLink('/galeria','Galería')}
      {currentUser?.role && ['BUSINESS_OWNER','SUPERADMIN','ALCALDIA_ADMIN'].includes(currentUser.role) ? link('/mis-hoteles','Mi negocio','mobile-register-link') : null}
      {currentUser ? <button type="button" className="mobile-account-action" onClick={() => { signOut(); setMenu(false); }}>Cerrar sesión <span>↗</span></button> : <><button type="button" className="mobile-account-action" onClick={() => { setAfterLoginAction('none'); setAuthMode('login'); setGoogleError(''); setAuthOpen(true); setMenu(false); }}>Iniciar sesión</button>{link('/registrar-negocio',<>Registrar mi negocio <span>↗</span></>,'mobile-register-link')}</>}
    </nav>
    <div className="nav-side">{currentUser && <button className="saved nav-favorites" aria-label="Ver favoritos" onClick={() => go('/favoritos')}>♡ <span>Guardados {saved.length}</span></button>}{currentUser?.role && ['BUSINESS_OWNER','SUPERADMIN','ALCALDIA_ADMIN'].includes(currentUser.role) && link('/mis-hoteles','Mi negocio','login-link')}{currentUser ? <><span className="user-chip">{currentUser.fullName.split(' ')[0]}</span><button className="signout" onClick={signOut}>Salir</button></> : <><button className="login-link" onClick={() => {setAfterLoginAction('none');setAuthMode('login');setGoogleError('');setAuthOpen(true);}}>Iniciar sesión</button>{link('/registrar-negocio',<>Registra tu negocio <span>↗</span></>,'register-link')}</>}</div>
  </header>{authToast}{authDialog}{placeDetail}{inquiryDialog}</>;

  const footer = <footer className="site-footer"><div className="footer-inner"><div className="footer-columns"><section className="footer-about">{link('/',<><span className="brand-mark">P.</span><span>PUERTO<br/><small>ESCONDIDO</small></span></>,'brand footer-brand')}<p>Una guía para descubrir los paisajes, sabores y experiencias de Puerto Escondido, Córdoba, y conectar con quienes hacen parte del destino.</p><span className="footer-location">Puerto Escondido · Córdoba, Colombia</span></section><nav className="footer-column" aria-label="Explora y planea"><h2>EXPLORA Y PLANEA</h2>{link('/lugares','Lugares y comercios')}{link('/que-hacer','Qué hacer')}{link('/transportes','Cómo llegar y transporte')}{link('/mapa','Mapa interactivo')}</nav><nav className="footer-column" aria-label="Municipio y comunidad"><h2>MUNICIPIO Y COMUNIDAD</h2>{link('/municipio','Historia e identidad')}{link('/eventos','Eventos locales')}{link('/galeria','Galería')}{link('/registrar-negocio','Registra tu negocio')}</nav></div><div className="footer-bottom"><span>© 2026 Descubre Puerto Escondido · Córdoba, Colombia</span><span>Las fotografías conservan el crédito de sus autores.</span></div></div></footer>;

  if (path === '/admin') return <AdminDashboard sessionActive={sessionActive} userName={currentUser?.fullName} onRequestLogin={() => { setAfterLoginAction('admin'); setAuthMode('login'); setGoogleError(''); setAuthOpen(true); go('/'); }} />;

  if (path === '/registrar-negocio') return <>{header}<main className="business-registration-page">
    {businessFormOpen && currentUser?.role === 'BUSINESS_OWNER' ? <BusinessRegistrationWizard api={API} initialCategorySlug={newHotel.categorySlug} onBack={() => setBusinessFormOpen(false)} onCreated={() => { void getData<Business[]>("/hotel-management/mine").then((items) => setManagedHotels(items)).catch(() => {}); }} /> : <>
      <section className="business-hero"><div className="business-hero-copy"><span className="eyebrow">ANFITRIONES DEL CARIBE CORDOBÉS</span><h1>Lo que haces aquí<br/><em>merece encontrarse.</em></h1><p>Conecta tu alojamiento, restaurante, experiencia o servicio de transporte con viajeros que buscan conocer Puerto Escondido.</p><button className="dark-btn" onClick={() => void startBusinessRegistration()} disabled={businessRegistrationLoading}>{businessRegistrationLoading ? 'Preparando tu cuenta…' : currentUser?.role === 'BUSINESS_OWNER' ? 'Registrar mi establecimiento' : 'Comenzar mi registro'} <span>→</span></button><small>Gratis · toma unos minutos · revisión antes de publicar</small></div><div className="business-hero-photo" style={{backgroundImage:`linear-gradient(180deg,transparent 35%,#183f34b8),url('${picture(town?.coverImageUrl)}')`}}><span>PUERTO ESCONDIDO · CÓRDOBA</span><b>Hecho por<br/><em>gente de aquí.</em></b></div></section>
      <section className="business-category-section"><div className="business-section-heading"><span className="eyebrow">ELIGE TU CAMINO</span><h2>¿Qué quieres compartir?</h2><p>Inicia con la ficha básica. Luego podrás ampliar cada detalle desde tu panel.</p></div><div className="business-category-grid">
        {[{slug:'hoteles',icon:'⌂',title:'Alojamiento',copy:'Hoteles, posadas, cabañas y habitaciones.'},{slug:'restaurantes',icon:'◒',title:'Restaurante',copy:'Cocina local, cafés y sabores de la costa.'},{slug:'tours',icon:'⌖',title:'Tour o experiencia',copy:'Recorridos, naturaleza y planes con guías locales.'},{slug:'transportes',icon:'↗',title:'Transporte',copy:'Rutas, traslados y servicios para llegar y moverse.'}].map((item) => <button className="business-category-card" key={item.slug} onClick={() => void startBusinessRegistration(item.slug)} disabled={businessRegistrationLoading}><span className="business-category-icon">{item.icon}</span><b>{item.title}</b><p>{item.copy}</p><span className="business-card-link">Registrar este negocio ↗</span></button>)}
      </div>{businessRegistrationError && <p className="api-error business-registration-error" role="alert">{businessRegistrationError}</p>}</section>
      <section className="business-steps"><article><span>01</span><div><b>Cuéntanos de tu oferta</b><p>Nombre, ubicación, contacto y qué haces.</p></div></article><article><span>02</span><div><b>Completas tu perfil</b><p>Agrega fotos, menú, habitaciones o servicios.</p></div></article><article><span>03</span><div><b>Revisamos y publicamos</b><p>Validamos la información antes de mostrarla.</p></div></article></section>
      <section className="business-host-cta"><div><span className="eyebrow light">UNA VITRINA PARA LO LOCAL</span><h2>Tu negocio también<br/>hace parte <em>del destino.</em></h2></div><button className="cream-btn" onClick={() => void startBusinessRegistration()} disabled={businessRegistrationLoading}>Registrar mi negocio <span>→</span></button></section>
    </>}
  </main>{footer}</>;

  if (path === '/mis-hoteles') return <>{header}<main>
    <section className="directory-hero"><span className="eyebrow light">PANEL DEL ANFITRIÓN</span><h1>Tu negocio,<br/><em>en buenas manos.</em></h1><p>Administra hoteles, restaurantes y experiencias desde un mismo lugar.</p></section>
    <section className="section directory-section hotel-admin"><div className="section-heading"><div><span className="eyebrow">GESTIÓN DE ESTABLECIMIENTOS</span><h2>Tu oferta <em>local.</em></h2></div></div>
    {!sessionActive ? <div className="empty-state"><p>Inicia sesión como anfitrión para registrar y administrar tus negocios.</p><button className="dark-btn" onClick={() => {setAuthMode('login');setAuthOpen(true);}}>Iniciar sesión →</button></div> : hotelManagementError && !managedHotels.length ? <p className="api-error">{hotelManagementError}</p> : <>
      {currentUser?.role === 'BUSINESS_OWNER' && <div className="room-editor hotel-registration"><h4>Registra un establecimiento</h4><p>Completa los detalles en un asistente por pasos, según sea alojamiento, restaurante o tour.</p><button className="dark-btn" type="button" onClick={() => { setNewHotel({ ...newHotel, categorySlug: 'hoteles' }); setBusinessFormOpen(true); go('/registrar-negocio'); }}>Comenzar registro →</button></div>}
      {hotelManagementError && <p className="api-error">{hotelManagementError}</p>}
      {managedHotels.length === 0 && currentUser?.role !== 'BUSINESS_OWNER' && <p className="empty">No hay establecimientos asociados a esta cuenta.</p>}
      {managedHotels.map((hotel) => <section className="managed-hotel" key={hotel.id}>
        <div className="managed-hotel-heading"><div><span className="eyebrow">{hotel.category.name.toUpperCase()} · {hotel.zone}</span><h3>{hotel.name}</h3><p>{hotel.address} · {hotel.status}</p></div><span className="result-count">{hotel.category.slug === 'hoteles' ? `${hotel.roomTypes.length} tipos de habitación` : hotel.category.slug === 'restaurantes' ? 'Menú y servicios' : hotel.category.slug === 'transportes' ? 'Rutas y tarifas' : 'Experiencias y servicios'}</span></div>
        {hotel.category.slug === 'restaurantes' && <form className="room-editor detail-editor" onSubmit={(event) => void saveBusinessDetails(event,hotel)}><h4>Perfil del restaurante</h4><div className="room-form-grid">
          <label className="room-form-wide">Horarios (separa cada día con punto y coma)<input name="openingHours" defaultValue={Object.entries(hotel.restaurantDetail?.openingHours || {}).map(([day,time]) => `${day}: ${time}`).join('; ')} placeholder="Lunes: 8:00-18:00; Martes: 8:00-18:00"/></label>
          <label>Días de cierre<input name="closedDays" defaultValue={hotel.restaurantDetail?.closedDays.join(', ')} placeholder="Domingo, festivos"/></label><label>Ambiente<input name="atmosphere" defaultValue={hotel.restaurantDetail?.atmosphere || ''}/></label><label>Capacidad<input name="capacity" type="number" min="1" defaultValue={hotel.restaurantDetail?.capacity || ''}/></label><label>Consumo promedio por persona<input name="averageSpend" type="number" min="1" defaultValue={hotel.restaurantDetail?.averageSpend || ''}/></label><label>Servicios<input name="serviceOptions" defaultValue={hotel.restaurantDetail?.serviceOptions.join(', ')} placeholder="Domicilio, para llevar, reservas"/></label><label>Medios de pago<input name="paymentMethods" defaultValue={hotel.restaurantDetail?.paymentMethods.join(', ')} placeholder="Efectivo, transferencia, tarjeta"/></label><label>Opciones alimentarias<input name="dietaryOptions" defaultValue={hotel.restaurantDetail?.dietaryOptions.join(', ')} placeholder="Vegetariano, vegano, sin gluten"/></label><label className="room-form-wide">Accesibilidad<textarea name="accessibilityInfo" defaultValue={hotel.restaurantDetail?.accessibilityInfo || ''}/></label><label className="room-check"><input name="reservationRequired" type="checkbox" defaultChecked={hotel.restaurantDetail?.reservationRequired}/> Requiere reserva</label>
        </div><button className="dark-btn" disabled={businessDetailSaving === hotel.id}>{businessDetailSaving === hotel.id ? 'Guardando…' : 'Guardar perfil del restaurante'} →</button></form>}
        {hotel.category.slug === 'tours' && <form className="room-editor detail-editor" onSubmit={(event) => void saveBusinessDetails(event,hotel)}><h4>Ficha de la experiencia</h4><div className="room-form-grid">
          <label>Duración (minutos)<input name="durationMinutes" required type="number" min="1" defaultValue={hotel.tourDetail?.durationMinutes || 180}/></label><label>Horarios de salida<input name="schedules" defaultValue={hotel.tourDetail?.schedules.join(', ')} placeholder="8:00, 14:00"/></label><label>Punto de encuentro<input name="meetingPoint" required defaultValue={hotel.tourDetail?.meetingPoint || hotel.address}/></label><label>Nivel de esfuerzo<input name="physicalLevel" defaultValue={hotel.tourDetail?.physicalLevel || 'Suave'}/></label><label>Cupo mínimo<input name="minGroupSize" type="number" min="1" defaultValue={hotel.tourDetail?.minGroupSize || 1}/></label><label>Cupo máximo<input name="maxGroupSize" type="number" min="1" defaultValue={hotel.tourDetail?.maxGroupSize || ''}/></label><label>Edad mínima<input name="minAge" type="number" min="0" defaultValue={hotel.tourDetail?.minAge ?? ''}/></label><label>Edad máxima<input name="maxAge" type="number" min="0" defaultValue={hotel.tourDetail?.maxAge ?? ''}/></label><label>Idiomas<input name="languages" defaultValue={hotel.tourDetail?.languages.join(', ') || 'Español'}/></label><label>Qué incluye<input name="included" defaultValue={hotel.tourDetail?.included.join(', ')} placeholder="Guía, transporte, refrigerio"/></label><label>Qué llevar o requisitos<input name="requirements" defaultValue={hotel.tourDetail?.requirements.join(', ')}/></label><label>Política de cancelación<input name="cancellationPolicy" defaultValue={hotel.tourDetail?.cancellationPolicy || 'Consultar con el operador'}/></label><label>Política por clima<input name="weatherPolicy" defaultValue={hotel.tourDetail?.weatherPolicy || ''}/></label><label className="room-form-wide">Accesibilidad<textarea name="accessibilityInfo" defaultValue={hotel.tourDetail?.accessibilityInfo || ''}/></label>
        </div><button className="dark-btn" disabled={businessDetailSaving === hotel.id}>{businessDetailSaving === hotel.id ? 'Guardando…' : 'Guardar ficha del tour'} →</button></form>}
        {(hotel.category.slug === 'restaurantes' || hotel.category.slug === 'tours' || hotel.category.slug === 'transportes') && <section className="room-editor detail-editor"><h4>{hotel.category.slug === 'restaurantes' ? 'Carta y prestaciones' : hotel.category.slug === 'transportes' ? 'Rutas y tarifas' : 'Prestaciones adicionales'}</h4>
          {hotel.category.slug === 'restaurantes' && <><div className="managed-room-list">{hotel.menuItems.map((item) => <article className="managed-room" key={item.id}><div><b>{item.name}</b><p>{item.category || 'Carta'} · {item.description}</p></div><strong>{money(item.price)}</strong><button type="button" className="outline-btn" onClick={() => void removeCatalogItem(hotel,'menu-items',item.id)}>Quitar</button></article>)}</div><form className="catalog-add-form" onSubmit={(event) => void createCatalogItem(event,hotel,'menu-items')}><input name="name" required placeholder="Plato o bebida"/><input name="category" placeholder="Categoría"/><input name="description" placeholder="Descripción e ingredientes"/><input name="price" required type="number" min="1" placeholder="Precio COP"/><input name="imageUrl" type="url" placeholder="URL de foto opcional"/><button className="dark-btn">Agregar al menú</button></form></>}
          <div className="managed-room-list">{hotel.services.map((service) => <article className="managed-room" key={service.id}><div><b>{service.name}</b><p>{service.description}</p></div><strong>{money(service.price)} {service.priceUnit ? `/ ${service.priceUnit}` : ''}</strong><button type="button" className="outline-btn" onClick={() => void removeCatalogItem(hotel,'services',service.id)}>Quitar</button></article>)}</div><form className="catalog-add-form" onSubmit={(event) => void createCatalogItem(event,hotel,'services')}><input name="name" required placeholder={hotel.category.slug === 'restaurantes' ? 'Reservas, domicilio…' : hotel.category.slug === 'transportes' ? 'Montería → Puerto Escondido' : 'Transporte, refrigerio…'}/><input name="description" placeholder={hotel.category.slug === 'transportes' ? 'Horarios, paradas, duración…' : 'Descripción'}/><input name="price" type="number" min="1" placeholder="Precio opcional"/><input name="priceUnit" placeholder={hotel.category.slug === 'transportes' ? 'persona, trayecto…' : 'persona, pedido…'}/><button className="dark-btn">Agregar prestación</button></form>
        </section>}
        {hotel.category.slug === 'hoteles' && <><div className="managed-room-list">{hotel.roomTypes.map((room) => <article className="managed-room" key={room.id}><div><b>{room.name}</b><p>{room.maxAdults} adultos · {room.maxChildren} niños · {room.bedDescription}{room.areaSqm ? ` · ${room.areaSqm} m²` : ''} · {room.quantity} unidades</p><small>{room.breakfastIncluded ? 'Desayuno incluido' : 'Sin desayuno'} · {room.refundable ? room.cancellationPolicy : 'No reembolsable'} · {room.prepaymentPolicy}</small></div><strong>{money(room.nightlyRate)} / noche</strong><button className="outline-btn" onClick={() => void deleteRoom(hotel.id,room.id)}>Eliminar</button></article>)}</div>
          <form className="room-editor" onSubmit={(event) => {setRoomDraft((draft) => ({...draft,businessId:hotel.id}));void saveRoom(event);}}><h4>Registrar tipo de habitación</h4><div className="room-form-grid"><label>Nombre<input required minLength={2} value={roomDraft.name} onChange={(e) => setRoomDraft({...roomDraft,name:e.target.value,businessId:hotel.id})}/></label><label>Tarifa por noche<input required type="number" min="1" value={roomDraft.nightlyRate} onChange={(e) => setRoomDraft({...roomDraft,nightlyRate:e.target.value,businessId:hotel.id})}/></label><label>Adultos<input required type="number" min="1" value={roomDraft.maxAdults} onChange={(e) => setRoomDraft({...roomDraft,maxAdults:Number(e.target.value),businessId:hotel.id})}/></label><label>Niños<input type="number" min="0" value={roomDraft.maxChildren} onChange={(e) => setRoomDraft({...roomDraft,maxChildren:Number(e.target.value),businessId:hotel.id})}/></label><label>Cantidad<input required type="number" min="1" value={roomDraft.quantity} onChange={(e) => setRoomDraft({...roomDraft,quantity:Number(e.target.value),businessId:hotel.id})}/></label><label>Área m²<input type="number" min="1" value={roomDraft.areaSqm} onChange={(e) => setRoomDraft({...roomDraft,areaSqm:e.target.value,businessId:hotel.id})}/></label><label>Camas<input required value={roomDraft.bedDescription} onChange={(e) => setRoomDraft({...roomDraft,bedDescription:e.target.value,businessId:hotel.id})}/></label><label>Comodidades<input value={roomDraft.amenities} onChange={(e) => setRoomDraft({...roomDraft,amenities:e.target.value,businessId:hotel.id})}/></label><label className="room-form-wide">Descripción<textarea required minLength={5} value={roomDraft.description} onChange={(e) => setRoomDraft({...roomDraft,description:e.target.value,businessId:hotel.id})}/></label><label>Cancelación<input required value={roomDraft.cancellationPolicy} onChange={(e) => setRoomDraft({...roomDraft,cancellationPolicy:e.target.value,businessId:hotel.id})}/></label><label>Pago anticipado<input required value={roomDraft.prepaymentPolicy} onChange={(e) => setRoomDraft({...roomDraft,prepaymentPolicy:e.target.value,businessId:hotel.id})}/></label><label className="room-check"><input type="checkbox" checked={roomDraft.breakfastIncluded} onChange={(e) => setRoomDraft({...roomDraft,breakfastIncluded:e.target.checked,businessId:hotel.id})}/> Desayuno incluido</label><label className="room-check"><input type="checkbox" checked={roomDraft.refundable} onChange={(e) => setRoomDraft({...roomDraft,refundable:e.target.checked,businessId:hotel.id})}/> Reembolsable</label></div><button className="dark-btn" type="submit" disabled={roomSaving}>{roomSaving ? 'Guardando…' : 'Guardar habitación'} →</button></form></>}
      </section>)}
    </>}
    </section></main>{footer}</>;

  if (path === '/lugares') return <>{header}<main className="catalog-page">
    <section className="catalog-intro"><div className="catalog-breadcrumb">Puerto Escondido <span>/</span> Explora <span>/</span> Directorio</div><div className="catalog-heading"><div><span className="eyebrow">ALOJAMIENTOS · SABORES · EXPERIENCIAS</span><h1>Explora <em>el Puerto.</em></h1><p>Encuentra lugares, servicios y experiencias locales para armar tu visita.</p></div><span className="catalog-total"><b>{catalogTotal}</b><small>{catalogTotal === 1 ? 'opción' : 'opciones'}</small></span></div></section>
    <section className="catalog-content"><div className="catalog-toolbar"><label className="catalog-search"><span>⌕</span><input value={query} onChange={(event) => { setQuery(event.target.value); setCatalogPage(1); }} placeholder="Busca por nombre, servicio o plato" aria-label="Buscar en los lugares"/><kbd>Buscar</kbd></label><div className="catalog-filters" aria-label="Filtrar por categoría">{directoryCategories.map((item) => {const count = item === 'Todo' ? directoryCategories.slice(1).reduce((sum, category) => sum + (catalogCategoryCounts[category.toLowerCase()] || 0), 0) : catalogCategoryCounts[item.toLowerCase()] || 0; return <button key={item} className={active === item ? 'catalog-filter active' : 'catalog-filter'} onClick={() => { setActive(item); setCatalogPage(1); }}>{item}<span>{count}</span></button>;})}</div></div>
      <a className="catalog-transport-shortcut" href="/transportes" onClick={(event) => { event.preventDefault(); go('/transportes'); }}><span className="catalog-transport-kicker">¿NECESITAS LLEGAR?</span><span className="catalog-transport-copy"><b>Cómo llegar y transporte</b><small>Consulta rutas y opciones para moverte por el municipio.</small></span><strong>Ver opciones <span>→</span></strong></a>
      <div className="catalog-advanced-toolbar"><p>{catalogTotal} {catalogTotal === 1 ? 'resultado' : 'resultados'}{advancedFilterCount > 0 ? ` · ${advancedFilterCount} filtros activos` : ''}</p><button type="button" className={advancedFiltersOpen ? 'advanced-filter-toggle active' : 'advanced-filter-toggle'} aria-expanded={advancedFiltersOpen} onClick={() => setAdvancedFiltersOpen((open) => !open)}><span>＋</span> Filtros avanzados {advancedFilterCount > 0 && <b>{advancedFilterCount}</b>}</button></div>
      {advancedFiltersOpen && advancedFilterPanel}
      {error && <p className="api-error">{error}</p>}
      {catalogLoading && !catalogPlaces.length ? <p className="empty">Cargando lugares del directorio…</p> : catalogPlaces.length ? <div className="cards directory-cards" aria-busy={catalogLoading}>{catalogPlaces.map((place) => card(place))}</div> : !error && <p className="empty">No hay lugares que coincidan con la búsqueda.</p>}
      {catalogTotalPages > 1 && <nav className="list-pagination" aria-label="Páginas del directorio"><button disabled={catalogPage <= 1 || catalogLoading} onClick={() => setCatalogPage((page) => Math.max(1, page - 1))}>← Anterior</button><span>Página {catalogPage} de {catalogTotalPages}</span><button disabled={catalogPage >= catalogTotalPages || catalogLoading} onClick={() => setCatalogPage((page) => Math.min(catalogTotalPages, page + 1))}>Siguiente →</button></nav>}
    </section>
  </main>{footer}</>;

  const galleryCategories = ['Todas', 'Playas y mar', 'Naturaleza y manglares', 'Gastronomía', 'Cultura y pueblo'];
  const displayedGallery = gallery;
  if (path === '/galeria') return <>{header}<main className="gallery-page"><section className="gallery-hero"><div><span className="eyebrow light">PLAYAS · CULTURA · GASTRONOMÍA</span><h1>Postales de <em>el Puerto.</em></h1><p>Un recorrido visual por playas vírgenes, manglares silenciosos, sabores ancestrales y colores del Caribe cordobés capturados por locales y viajeros.</p><button className="cream-btn" onClick={requestUpload}>＋ &nbsp; Compartir mi postal <span>→</span></button></div><div className="gallery-hero-art"><span>PUERTO</span><b>VIVE<br/>AQUÍ</b><i>09° 01’ N · 76° 15’ O</i></div><div className="gallery-hero-count"><b>{galleryAllTotal}</b><span>fotografías<br/>de la comunidad</span></div></section><section className="section community-gallery"><div className="gallery-toolbar"><div className="gallery-categories" aria-label="Filtrar fotos">{galleryCategories.map((item) => {const count = item === 'Todas' ? galleryAllTotal : galleryCategoryCounts[item] || 0; return <button key={item} className={galleryCategory === item ? 'gallery-filter active' : 'gallery-filter'} onClick={() => { setGalleryCategory(item); setGalleryPage(1); }} aria-pressed={galleryCategory === item}>{item}<span>{count}</span></button>;})}</div><div className="gallery-tools"><div className="gallery-sort" aria-label="Ordenar fotografías"><button className={gallerySort === 'recent' ? 'active' : ''} onClick={() => { setGallerySort('recent'); setGalleryPage(1); }}>Recientes</button><button className={gallerySort === 'popular' ? 'active' : ''} onClick={() => { setGallerySort('popular'); setGalleryPage(1); }}>♥ Populares</button></div><button className="gallery-share" onClick={requestUpload}>＋ Compartir mi postal</button></div></div>{galleryError && <p className="api-error">{galleryError}</p>}{galleryLoading ? <p className="empty">Cargando las fotos de la comunidad…</p> : displayedGallery.length ? <div className="community-grid">{displayedGallery.map((photo) => <article className="community-photo" key={photo.id}><div className="community-photo-frame"><button className="community-photo-image" onClick={() => setSelectedPhoto(photo)} aria-label={`Ver detalles: ${photo.caption || photo.category}`}><img src={apiImage(photo.imageUrl)} alt={photo.caption || `Foto compartida por ${photo.user.fullName}`} loading="lazy"/><span className="photo-open-hint">Ver postal ↗</span></button><span className="photo-category-tag">{photo.category}</span><button className={photo.likedByMe ? 'photo-like liked' : 'photo-like'} onClick={() => void toggleGalleryLike(photo)} aria-label={`${photo.likedByMe ? 'Quitar like' : 'Dar like'} · ${photo.likesCount} likes`} title={sessionActive ? 'Me gusta' : 'Inicia sesión para dar me gusta'}>♡ <b>{photo.likesCount}</b></button><span className="photo-location-tag">⌖ {photo.location}</span></div><div className="community-photo-info"><p>{photo.caption || 'Un momento en Puerto Escondido'}</p><div className="photo-byline"><span>Por {photo.user.fullName}</span><small>{new Date(photo.createdAt).toLocaleDateString('es-CO')}</small></div><div className="photo-card-actions"><button onClick={() => setSelectedPhoto(photo)}>Ver postal <span>↗</span></button><a href={`${apiImage(photo.imageUrl)}?download=1`} download>Descargar <span>↓</span></a></div>{photo.sourceCredit && <a className="photo-credit" href={photo.sourceUrl || '#'} target="_blank" rel="noreferrer">Imagen: {photo.sourceCredit} ↗</a>}</div></article>)}</div> : !galleryError && <div className="gallery-empty"><span>✳</span><h3>{galleryTotal ? 'Todavía no hay postales en esta categoría.' : 'El primer recuerdo puede ser tuyo.'}</h3><p>Sube una foto del municipio y empieza la galería de la comunidad.</p><button className="dark-btn" onClick={requestUpload}>Compartir la primera foto <span>→</span></button></div>}{galleryTotalPages > 1 && <nav className="list-pagination gallery-pagination" aria-label="Páginas de la galería"><button disabled={galleryPage <= 1 || galleryLoading} onClick={() => setGalleryPage((page) => Math.max(1, page - 1))}>← Anterior</button><span>Página {galleryPage} de {galleryTotalPages}</span><button disabled={galleryPage >= galleryTotalPages || galleryLoading} onClick={() => setGalleryPage((page) => Math.min(galleryTotalPages, page + 1))}>Siguiente →</button></nav>}<p className="gallery-guidance">Comparte solo imágenes propias o que tengas permiso para publicar. Aceptamos JPG, PNG y WebP de hasta 5 MB.</p></section></main>{footer}
    {uploadOpen && <div className="modal-backdrop" onMouseDown={(event) => {if(event.target === event.currentTarget)setUploadOpen(false);}}><form className="community-modal upload-modal" onSubmit={submitPhoto}><button type="button" className="modal-close" onClick={() => setUploadOpen(false)} aria-label="Cerrar">×</button><span className="eyebrow">COMPARTE TU MIRADA</span><h2>Una postal del Puerto.</h2><p className="signed-in">Sesión iniciada como <b>{currentUser?.fullName}</b></p><label className="upload-drop">{photoPreview ? <img src={photoPreview} alt="Vista previa de la foto"/> : <><span>＋</span><b>Elige una foto</b><small>JPG, PNG o WebP · máximo 5 MB</small></>}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => {const file=event.target.files?.[0] || null;setUploadError('');if(file && !['image/jpeg','image/png','image/webp'].includes(file.type)){setUploadError('Elige una imagen JPG, PNG o WebP.');setPhotoFile(null);}else if(file && file.size > 5*1024*1024){setUploadError('La foto debe pesar 5 MB o menos.');setPhotoFile(null);}else setPhotoFile(file);}}/></label><label className="caption-label">Cuéntanos algo de este momento <textarea value={caption} onChange={(event) => setCaption(event.target.value)} maxLength={250} placeholder="¿Dónde fue? ¿Qué lo hace especial?"/></label><div className="gallery-upload-meta"><label>Categoría<select value={photoCategory} onChange={(event) => setPhotoCategory(event.target.value)}>{galleryCategories.slice(1).map((category) => <option key={category}>{category}</option>)}</select></label><label>Lugar<input value={photoLocation} onChange={(event) => setPhotoLocation(event.target.value)} maxLength={150} placeholder="Playa, barrio o paraje"/></label></div>{uploadError && <p className="modal-error">{uploadError}</p>}<button className="dark-btn publish-button" type="submit" disabled={!photoFile || uploading}>{uploading ? 'Publicando…' : 'Publicar foto'} <span>→</span></button><small>La imagen se guardará en la base de datos de la plataforma.</small></form></div>}
    {selectedPhoto && <div className="modal-backdrop photo-lightbox" onMouseDown={(event) => {if(event.target === event.currentTarget)setSelectedPhoto(null);}}><section className="lightbox-card" role="dialog" aria-modal="true" aria-label="Detalles de la fotografía"><button className="modal-close" onClick={() => setSelectedPhoto(null)} aria-label="Cerrar">×</button><img src={apiImage(selectedPhoto.imageUrl)} alt={selectedPhoto.caption || 'Foto de Puerto Escondido'}/><div className="lightbox-info"><span className="eyebrow">{selectedPhoto.category} · {selectedPhoto.location}</span><b>{selectedPhoto.caption || 'Un momento en Puerto Escondido'}</b><small>Compartida por {selectedPhoto.user.fullName} · {new Date(selectedPhoto.createdAt).toLocaleDateString('es-CO')}</small>{selectedPhoto.sourceCredit && <a className="photo-credit" href={selectedPhoto.sourceUrl || '#'} target="_blank" rel="noreferrer">Crédito de imagen: {selectedPhoto.sourceCredit} ↗</a>}<div className="lightbox-actions"><button className={selectedPhoto.likedByMe ? 'photo-like liked' : 'photo-like'} onClick={() => void toggleGalleryLike(selectedPhoto)}>♡ <b>{selectedPhoto.likesCount}</b> Me gusta</button><a className="dark-btn" href={`${apiImage(selectedPhoto.imageUrl)}?download=1`} download>Descargar imagen ↓</a></div></div></section></div>}
  </>;

  const eventPhoto = townPhotos.find((photo) => !photo.isHistorical && /muelle|bullerengue/i.test(photo.caption)) || townPhotos.find((photo) => !photo.isHistorical);
  const eventImage = eventPhoto ? apiImage(eventPhoto.imageUrl) : picture(town?.coverImageUrl);

  if (path === '/que-hacer') return <>{header}<main className="things-page">
    <section className="things-hero" style={{ backgroundImage: `linear-gradient(90deg,rgba(10,31,27,.78),rgba(10,31,27,.2)),url('${eventImage}')` }}><div><span className="eyebrow light">PUERTO ESCONDIDO · CÓRDOBA</span><h1>¿Qué hacer<br/><em>en el Puerto?</em></h1><p>Mar, naturaleza y cultura para descubrir a tu propio ritmo.</p><a href="#planes" className="cream-btn">Encuentra tu plan <span>↓</span></a></div><span className="things-hero-caption">UNA GUÍA PARA INSPIRAR TU VISITA</span></section>
    <section className="things-intro section"><div><span className="eyebrow">PLANES PARA CADA MOMENTO</span><h2>Un destino que se vive<br/><em>sin afán.</em></h2></div><p>Explora playas, paisajes naturales, sabores y tradiciones locales. Los recorridos y accesos pueden depender del clima, la temporada y la disponibilidad de guías: confirma los detalles antes de salir.</p></section>
    <section className="things-grid section" id="planes">
      <article className="thing-card" id="playas"><img src={destinationPhotos.sunsetBoats} alt="Atardecer con embarcaciones en la costa de Puerto Escondido" loading="lazy"/><div><span className="eyebrow">MAR · PLAYA</span><h3>Una tarde frente al Caribe</h3><p>Conoce el muelle turístico y las playas del Hoyito; pregunta localmente por las condiciones del mar y el acceso.</p>{link('/mapa','Ubicar el municipio →','thing-link')}</div></article>
      <article className="thing-card" id="volcan"><img src={destinationPhotos.beach} alt="Entorno natural costero de Puerto Escondido" loading="lazy"/><div><span className="eyebrow">GEOLOGÍA · NATURALEZA</span><h3>Volcán de Lodo y entorno natural</h3><p>La zona de Santa Cruz tiene antecedentes de inestabilidad del terreno. No ingreses a áreas restringidas y confirma las condiciones con las autoridades locales antes de acercarte.</p><a className="thing-link" href="https://cvs.gov.co/visita-de-inspeccion-por-agrietamiento-y-o-desplazamiento-de-suelo/" target="_blank" rel="noreferrer">Consultar recomendaciones de la CVS ↗</a></div></article>
      <article className="thing-card"><img src={destinationPhotos.turtle} alt="Escultura de tortuga marina junto al muelle" loading="lazy"/><div><span className="eyebrow">AGUA · ECOTURISMO</span><h3>Manglares y Quebrada Yuca</h3><p>Consulta si hay recorridos guiados, observación de aves o paseos comunitarios disponibles durante tu visita.</p><a className="thing-link" href="https://conectaregioncaribe.mintic.gov.co/producto/ecorrido-turistico-por-puerto-escondido-y-cristo-rey/" target="_blank" rel="noreferrer">Conocer experiencias locales ↗</a></div></article>
      <article className="thing-card"><img src={destinationPhotos.bullerengue} alt="Monumento al bullerengue en Puerto Escondido" loading="lazy"/><div><span className="eyebrow">CULTURA · BULLERENGUE</span><h3>Escucha la memoria del Caribe</h3><p>Conoce el bullerengue y revisa la agenda local para saber si hay presentaciones o actividades culturales.</p>{link('/eventos','Consultar eventos →','thing-link')}</div></article>
      <article className="thing-card"><img src={destinationPhotos.kiosks} alt="Kioscos tradicionales bajo las palmeras" loading="lazy"/><div><span className="eyebrow">SABORES · COCINA LOCAL</span><h3>Prueba los sabores de la costa</h3><p>Explora restaurantes y consulta directamente qué platos, horarios y opciones están disponibles.</p>{link('/lugares?categoria=Restaurantes','Ver restaurantes →','thing-link')}</div></article>
      <article className="thing-card"><img src={destinationPhotos.pierSunset} alt="Muelle turístico de Puerto Escondido al atardecer" loading="lazy"/><div><span className="eyebrow">EXPERIENCIAS LOCALES</span><h3>Descubre con anfitriones del Puerto</h3><p>Busca tours y experiencias del directorio para consultar disponibilidad, duración y punto de encuentro.</p>{link('/lugares?categoria=Tours','Explorar tours →','thing-link')}</div></article>
    </section>
    <section className="things-note"><span className="eyebrow">VIAJA CON RESPETO</span><p>Antes de visitar playas, senderos o manglares, confirma acceso y condiciones con un guía o anfitrión local. Evita dejar residuos y respeta los espacios comunitarios.</p><a href="https://conectaregioncaribe.mintic.gov.co/producto/ecorrido-turistico-por-puerto-escondido-y-cristo-rey/" target="_blank" rel="noreferrer">Fuente: recorrido turístico de Puerto Escondido y Cristo Rey ↗</a></section>
    <section className="trip-planner-end"><span className="eyebrow light">ARMA TU VISITA</span><h2>¿Ya sabes por dónde<br/><em>empezar?</em></h2>{link('/planea-tu-viaje','Organizar mi viaje →','cream-btn')}</section>
  </main>{footer}</>;

  if (path === '/transportes') return <>{header}<main className="transport-page">
    <section className="transport-hero" style={{ backgroundImage: `linear-gradient(90deg,rgba(10,31,27,.82),rgba(10,31,27,.24)),url('${picture(town?.coverImageUrl)}')` }}><div><span className="eyebrow light">LLEGA AL CARIBE CORDOBÉS</span><h1>El camino te<br/><em>trae al Puerto.</em></h1><p>Consulta opciones para viajar a Puerto Escondido y confirma horarios y disponibilidad antes de salir.</p><a className="cream-btn" href="#opciones-transporte">Ver opciones <span>↓</span></a></div><span className="things-hero-caption">PUERTO ESCONDIDO · CÓRDOBA</span></section>
    <section className="transport-intro section"><div><span className="eyebrow">CÓMO LLEGAR</span><h2>Conecta desde<br/><em>Montería.</em></h2></div><p>Consulta los operadores y las rutas registradas en el directorio. Confirma la próxima salida, duración, tarifa y punto de abordaje directamente con cada proveedor.</p></section>
    <section className="transport-options section" id="opciones-transporte">{places.filter((place) => place.category.slug === 'transportes').length ? places.filter((place) => place.category.slug === 'transportes').map((provider) => {
        const phone = provider.whatsappNumber.replace(/\D/g, '');
        const whatsappPhone = phone.length === 10 ? `57${phone}` : phone;
        const coordinates = provider.latitude != null && provider.longitude != null ? `${provider.latitude},${provider.longitude}` : `${provider.address}, Puerto Escondido, Córdoba`;
        const uploadedPhotos = provider.media.filter((media) => media.imageUrl);
        const transportPhotos = uploadedPhotos.length ? uploadedPhotos : transportFallbackPhotos.map((imageUrl, displayOrder) => ({ id: `transport-demo-${displayOrder}`, imageUrl, mimeType: 'image/jpeg', isCover: displayOrder === 0, displayOrder }));
        const transportPhotoIndex = (transportImageIndices[provider.id] || 0) % transportPhotos.length;
        const activeTransportPhoto = transportPhotos[transportPhotoIndex];
        const moveTransportPhoto = (step: number) => setTransportImageIndices((current) => ({ ...current, [provider.id]: ((current[provider.id] || 0) + step + transportPhotos.length) % transportPhotos.length }));
        return <article className="transport-card transport-primary" key={provider.id}><div className="transport-card-image" onTouchStart={(event) => {swipeStartX.current = event.touches[0]?.clientX ?? null;}} onTouchEnd={(event) => {const start = swipeStartX.current; const end = event.changedTouches[0]?.clientX; if (start !== null && end !== undefined && Math.abs(end - start) > 45 && transportPhotos.length > 1) moveTransportPhoto(end < start ? 1 : -1); swipeStartX.current = null;}}><img key={activeTransportPhoto.id} src={mediaSource(provider, activeTransportPhoto)} alt={`${provider.name} · foto ${transportPhotoIndex + 1}`} loading="lazy"/><span className="transport-photo-label">{uploadedPhotos.length ? 'FOTOS DEL TRANSPORTE' : 'IMÁGENES ILUSTRATIVAS'}</span>{transportPhotos.length > 1 && <><button className="transport-gallery-arrow previous" type="button" onClick={(event) => {event.stopPropagation();moveTransportPhoto(-1);}} aria-label={`Foto anterior de ${provider.name}`}>‹</button><button className="transport-gallery-arrow next" type="button" onClick={(event) => {event.stopPropagation();moveTransportPhoto(1);}} aria-label={`Foto siguiente de ${provider.name}`}>›</button><span className="transport-photo-count">{transportPhotoIndex + 1} / {transportPhotos.length}</span></>}</div><div className="transport-card-content"><span className="eyebrow">{provider.zone.toUpperCase()} · TRANSPORTE</span><h3>{provider.name}</h3><p>{provider.shortDescription}</p>{provider.services.length ? <div className="transport-routes">{provider.services.map((service) => <div className="transport-route-row" key={service.id}><b>{service.name}</b><span>{money(service.price)}{service.priceUnit ? ` / ${service.priceUnit}` : ''}</span>{service.description && <small>{service.description}</small>}</div>)}</div> : <p>Consulta rutas, horarios y tarifas directamente con el operador.</p>}<div className="transport-contact"><a href={`https://wa.me/${whatsappPhone}?text=${encodeURIComponent(`Hola, quisiera consultar las rutas y horarios de ${provider.name}.`)}`} target="_blank" rel="noreferrer">Consultar por WhatsApp ↗</a><a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(coordinates)}`} target="_blank" rel="noreferrer">Ver ubicación ↗</a></div></div><span className="transport-route-mark">{provider.zone.slice(0, 3).toUpperCase()}<br/><b>↔</b><br/>PE</span></article>;
      }) : <article className="transport-card transport-empty"><span className="eyebrow">OPERADORES LOCALES</span><h3>Pronto encontrarás opciones de transporte.</h3><p>Los operadores registrados aparecerán aquí cuando su información sea revisada y aprobada.</p><a className="transport-callout" href="/registrar-negocio" onClick={(event) => { event.preventDefault(); go('/registrar-negocio'); void startBusinessRegistration('transportes'); }}>Registrar un servicio de transporte ↗</a></article>}
      <article className="transport-card"><span className="eyebrow">EN VEHÍCULO PARTICULAR</span><h3>Traza tu ruta</h3><p>Abre el mapa desde tu ubicación. Revisa el estado de las vías y calcula el recorrido antes de viajar.</p><a className="transport-callout" href="https://www.google.com/maps/dir/?api=1&destination=Puerto+Escondido%2C+C%C3%B3rdoba%2C+Colombia" target="_blank" rel="noreferrer">Abrir ruta en Google Maps ↗</a></article>
    </section>
    <section className="transport-advice"><span className="eyebrow">ANTES DE SALIR</span><h2>Confirma la información directamente.</h2><p>Salidas, tarifas y puntos de abordaje pueden cambiar. Verifica los detalles con el operador y compra en sus canales oficiales.</p>{link('/planea-tu-viaje','Volver al planificador →','thing-link')}</section>
  </main>{footer}</>;

  if (path === '/eventos') return <>{header}<main className="events-page">
    <section className="events-hero" style={{ backgroundImage: `linear-gradient(90deg,rgba(9,26,23,.82),rgba(9,26,23,.34) 68%,rgba(9,26,23,.08)),url('${eventImage}')` }}>
      <div className="events-hero-copy"><span className="eyebrow light">AGENDA CULTURAL · CÓRDOBA</span><h1>El Puerto se encuentra<br/>al ritmo del <em>tambor.</em></h1><p>Tradiciones vivas, música y comunidad en el litoral cordobés.</p><span className="events-date-pill">JUNIO · FECHA DE CADA EDICIÓN POR CONFIRMAR</span></div>
      <span className="events-hero-caption">PUERTO ESCONDIDO · CÓRDOBA, COLOMBIA</span>
    </section>
    <section className="event-feature section"><div className="event-feature-photo" style={{ backgroundImage: `url('${eventImage}')` }}><span>UNA TRADICIÓN QUE SE CANTA Y SE BAILA</span></div><div className="event-feature-copy"><span className="eyebrow">EVENTO DESTACADO</span><h2>Festival Nacional<br/>del <em>Bullerengue.</em></h2><p>Durante el festival, Puerto Escondido recibe cantadoras, grupos de baile y visitantes para celebrar una expresión afrocaribeña que se transmite entre generaciones.</p><p>La programación y las fechas exactas cambian en cada edición. Confírmalas con la organización antes de planear tu viaje.</p><a className="event-source-link" href="https://calendarioferiasyfiestas.fontur.com.co/en/agenda/bullerengue-festival" target="_blank" rel="noreferrer">Ver información cultural en FONTUR ↗</a><div className="event-feature-actions">{link('/planea-tu-viaje','Planea tu visita →','dark-btn')}{link('/lugares?categoria=Hoteles','Buscar alojamiento ↗','under-link')}</div></div></section>
    <section className="event-details section"><div className="event-section-heading"><span className="eyebrow">UNA CELEBRACIÓN DE VARIOS DÍAS</span><h2>Más que un escenario,<br/><em>un encuentro.</em></h2><p>Las ediciones recientes han reunido muestras musicales, danza, talleres, encuentros de saberes y actividades comunitarias.</p></div><div className="event-moments"><article><span>01</span><b>Cantos y tambores</b><p>Escucha los distintos aires del bullerengue y sus voces tradicionales.</p></article><article><span>02</span><b>Danza y comparsas</b><p>El baile y el encuentro llenan de movimiento los espacios del municipio.</p></article><article><span>03</span><b>Memoria compartida</b><p>Conoce una tradición que las comunidades mantienen viva.</p></article></div><small className="event-editorial-note">La agenda, los escenarios y las actividades dependen de cada edición. Consulta los anuncios de la organización local.</small></section>
    <section className="events-footer-cta"><span className="eyebrow light">VEN A TU RITMO</span><h2>Encuentra dónde quedarte<br/>y cómo moverte.</h2>{link('/planea-tu-viaje',<>Planea tu viaje <span>→</span></>,'cream-btn')}</section>
  </main>{footer}</>;

  const tripPlans: Record<1 | 2 | 3, { title: string; steps: { moment: string; title: string; copy: string; href: string; action: string }[] }> = {
    1: { title: 'Una escapada breve', steps: [
      { moment: 'MAÑANA', title: 'Ubica tu ruta y elige el ritmo', copy: 'Revisa el mapa y consulta con los anfitriones las condiciones del día.', href: '/mapa', action: 'Abrir mapa' },
      { moment: 'MEDIODÍA', title: 'Haz una pausa para comer', copy: 'Explora opciones de cocina local y confirma horarios directamente.', href: '/lugares?categoria=Restaurantes', action: 'Ver restaurantes' },
      { moment: 'TARDE', title: 'Guarda tiempo para la costa', copy: 'Pregunta por recorridos disponibles y recomendaciones locales.', href: '/lugares?categoria=Tours', action: 'Ver experiencias' },
    ] },
    2: { title: 'Un fin de semana tranquilo', steps: [
      { moment: 'DÍA 1 · LLEGADA', title: 'Instálate sin afán', copy: 'Elige un hospedaje y confirma llegada, disponibilidad y servicios.', href: '/lugares?categoria=Hoteles', action: 'Buscar hospedaje' },
      { moment: 'DÍA 1 · TARDE', title: 'Conoce la mesa local', copy: 'Consulta el menú, la ubicación y los horarios antes de salir.', href: '/lugares?categoria=Restaurantes', action: 'Explorar restaurantes' },
      { moment: 'DÍA 2', title: 'Sal a recorrer el territorio', copy: 'Pregunta a operadores locales por el clima, el recorrido y lo que incluye.', href: '/lugares?categoria=Tours', action: 'Ver tours' },
    ] },
    3: { title: 'Tres días para ir despacio', steps: [
      { moment: 'DÍA 1', title: 'Llega y acomódate', copy: 'Confirma tu hospedaje y deja un espacio para recorrer el centro.', href: '/lugares?categoria=Hoteles', action: 'Buscar hospedaje' },
      { moment: 'DÍA 2', title: 'Elige una experiencia local', copy: 'Consulta con un anfitrión las condiciones, duración y punto de encuentro.', href: '/lugares?categoria=Tours', action: 'Ver experiencias' },
      { moment: 'DÍA 3', title: 'Cierra con cultura y sabor', copy: 'Descubre la historia del municipio y organiza una última comida local.', href: '/municipio', action: 'Conocer el municipio' },
    ] },
  };

  if (path === '/planea-tu-viaje') return <>{header}<main className="trip-planner-page">
    <section className="trip-planner-hero" style={{ backgroundImage: `linear-gradient(90deg,rgba(10,31,27,.8),rgba(10,31,27,.25)),url('${picture(town?.coverImageUrl)}')` }}><div><span className="eyebrow light">PUERTO ESCONDIDO · A TU MANERA</span><h1>Menos afán.<br/>Más <em>Puerto.</em></h1><p>Una guía sencilla para organizar los días, encontrar lo que necesitas y dejar espacio para descubrir.</p><a className="cream-btn" href="#itinerario">Armar mi itinerario <span>↓</span></a></div><span className="trip-hero-note">CÓRDOBA · CARIBE COLOMBIANO</span></section>
    <section className="trip-planner-intro section"><div><span className="eyebrow">PLANEACIÓN FLEXIBLE</span><h2>Empieza por el<br/><em>tiempo que tienes.</em></h2></div><p>Este es un punto de partida, no una agenda fija. Confirma horarios, traslados y disponibilidad con cada establecimiento o guía antes de salir.</p></section>
    <section className="trip-builder section" id="itinerario"><div className="trip-builder-heading"><div><span className="eyebrow">TU RUTA SUGERIDA</span><h2>{tripPlans[tripDays].title}</h2></div><div className="trip-day-switch" aria-label="Duración del viaje">{([1,2,3] as const).map((days) => <button key={days} className={tripDays === days ? 'active' : ''} onClick={() => setTripDays(days)} aria-pressed={tripDays === days}>{days === 1 ? '1 día' : days === 2 ? 'Fin de semana' : '3 días'}</button>)}</div></div><div className="trip-timeline">{tripPlans[tripDays].steps.map((step,index) => <article className="trip-step" key={`${tripDays}-${step.moment}`}><span className="trip-step-number">0{index+1}</span><div className="trip-step-copy"><small>{step.moment}</small><h3>{step.title}</h3><p>{step.copy}</p>{link(step.href,<> {step.action} <span>→</span></>,'trip-step-link')}</div></article>)}</div>
      <p className="trip-plan-note">Las opciones del directorio dependen de la disponibilidad que confirme cada anfitrión. La plataforma facilita el contacto, no confirma reservas automáticamente.</p>
    </section>
    <section className="trip-logistics"><article><span className="eyebrow">CÓMO LLEGAR</span><h3>Traza la ruta desde tu punto de salida.</h3><p>Abre el mapa para consultar el trayecto hasta Puerto Escondido, Córdoba.</p><a href="https://www.google.com/maps/dir/?api=1&destination=Puerto+Escondido%2C+C%C3%B3rdoba%2C+Colombia" target="_blank" rel="noreferrer">Abrir indicaciones ↗</a></article><article><span className="eyebrow">AGENDA LOCAL</span><h3>Revisa si hay una celebración durante tu visita.</h3><p>La fecha del Festival del Bullerengue y su programación se confirman por edición.</p>{link('/eventos','Consultar eventos →','trip-step-link')}</article><article><span className="eyebrow">UBICACIÓN</span><h3>Orienta el recorrido sobre el mapa.</h3><p>Encuentra Puerto Escondido y ubica los puntos que comparten los anfitriones.</p>{link('/mapa','Ver mapa →','trip-step-link')}</article></section>
    <section className="trip-logistics section" id="recomendaciones"><article><span className="eyebrow">ANTES DE SALIR</span><h3>Confirma horarios y accesos.</h3><p>Consulta con los comercios o guías la disponibilidad, el punto de encuentro y las condiciones de acceso antes de iniciar un recorrido.</p></article><article><span className="eyebrow">CLIMA Y LLUVIAS</span><h3>Revisa el pronóstico del día.</h3><p>El tiempo puede cambiar las condiciones de playas, carreteras y senderos. Consulta el reporte oficial antes de salir.</p><a href="https://bart.ideam.gov.co/portal/prono_fin_semana/data/" target="_blank" rel="noreferrer">Consultar pronóstico del IDEAM ↗</a></article><article><span className="eyebrow">VIAJE RESPONSABLE</span><h3>Sigue las indicaciones locales.</h3><p>Respeta cierres, señalizaciones y recomendaciones de autoridades y anfitriones; evita ingresar a zonas restringidas.</p>{link('/transportes','Ver transporte →','trip-step-link')}</article></section>
    <section className="trip-planner-end"><span className="eyebrow light">YA CASI ESTÁS ALLÍ</span><h2>Escoge tu próximo<br/><em>lugar por descubrir.</em></h2>{link('/lugares','Explorar el directorio →','cream-btn')}</section>
  </main>{footer}</>;

  if (path === '/municipio') return <>{header}<main>
    {town ? <>
      <section className="town-hero municipality-hero" style={{backgroundImage:`linear-gradient(90deg,rgba(12,36,31,.79),rgba(12,36,31,.2)),url('${destinationPhotos.town}')`}}><div className="municipality-hero-copy"><span className="eyebrow light">{town.department.toUpperCase()} · LITORAL CARIBE</span><h1>{town.name}<br/><em>mar, memoria y vida.</em></h1><p>{town.tagline}</p><a className="cream-btn" href="#archivo-historico">Recorrer su historia <span>↓</span></a></div><div className="town-stats"><div><b>1854</b><span>origen del poblado</span></div><div><b>27 km</b><span>de costa Caribe</span></div><div><b>423 km²</b><span>de territorio</span></div></div></section>
      <section className="town-intro section municipality-intro"><div><span className="eyebrow">UN MUNICIPIO ENTRE MAR Y COLINAS</span><h2>Un Caribe de<br/><em>muchas historias.</em></h2></div><div><p>{town.introduction}</p><p>{town.geography}</p><a className="town-wiki-link" href={town.wikipediaUrl || 'https://es.wikipedia.org/wiki/Puerto_Escondido_(C%C3%B3rdoba)'} target="_blank" rel="noreferrer">Leer el artículo de Wikipedia ↗</a></div></section>
      {town.wikipediaSummary && <section className="wiki-summary section"><div className="wiki-summary-mark">W</div><div><span className="eyebrow">RESUMEN DE WIKIPEDIA · SINCRONIZADO DESDE SU API</span><p>{town.wikipediaSummary}</p><a href={town.wikipediaUrl || 'https://es.wikipedia.org/wiki/Puerto_Escondido_(C%C3%B3rdoba)'} target="_blank" rel="noreferrer">Consultar el artículo y sus fuentes ↗</a></div></section>}
      <section className="town-history section" id="historia-identidad"><div className="town-section-heading"><span className="eyebrow">MEMORIA PORTEÑA</span><h2>Una historia hecha <em>de encuentros.</em></h2><p>{town.history}</p></div><div className="history-markers"><article><span>1854</span><p>Familias procedentes de Barú se establecen en Puerto Escondido Viejo.</p></article><article><span>1923</span><p>El poblado es reconocido como corregimiento de Lorica, entonces en Bolívar.</p></article><article><span>1928</span><p>Se precisan los caseríos que integran el corregimiento y su cabecera.</p></article><article><span>1961</span><p>Puerto Escondido es erigido municipio del recién creado departamento de Córdoba.</p></article></div></section>
      <section className="town-archive section" id="archivo-historico"><div className="town-section-heading"><span className="eyebrow">FOTOGRAFÍAS DE ARCHIVO</span><h2>El Puerto de <em>otros tiempos.</em></h2><p>Imágenes antiguas compartidas para conservar la memoria de sus calles, plazas y paisajes.</p></div><div className="town-photo-grid archive-grid">{townPhotos.filter(photo => photo.isHistorical).map((photo,index) => <figure className={`town-photo-card archive-photo archive-photo-${index+1}`} key={photo.id}><img src={apiImage(photo.imageUrl)} alt={photo.caption} loading="lazy"/><figcaption><span>{photo.period}</span><b>{photo.caption}</b><small>{photo.credit}</small></figcaption></figure>)}</div></section>
      <section className="town-landscape"><div className="town-landscape-photo" style={{backgroundImage:`url('${picture(town.coverImageUrl)}')`}}><span>EL CARIBE CORDOBÉS · PUERTO ESCONDIDO</span></div><div className="town-landscape-copy"><span className="eyebrow">EL TERRITORIO</span><h2>Una costa de ríos,<br/><em>playas y humedales.</em></h2><p>{town.geography}</p><p>{town.nature}</p><a href="https://conectaregioncaribe.mintic.gov.co/producto/ecorrido-turistico-por-puerto-escondido-y-cristo-rey/" target="_blank" rel="noreferrer">Conocer el recorrido local ↗</a></div></section>
      <section className="town-nature section"><div className="town-section-heading"><span className="eyebrow">NATURALEZA Y VIDA</span><h2>Un paisaje que<br/><em>merece cuidado.</em></h2></div><div className="nature-columns"><article><span className="nature-icon">✳</span><span className="eyebrow">FLORA</span><h3>Manglar, monte y costa</h3><p>{town.flora}</p></article><article><span className="nature-icon">⌁</span><span className="eyebrow">FAUNA</span><h3>Vida entre agua y bosque</h3><p>{town.fauna}</p></article><article><span className="nature-icon">≈</span><span className="eyebrow">ECOSISTEMAS</span><h3>Ríos que llegan al mar</h3><p>{town.nature}</p></article></div><small className="nature-note">La información de flora y fauna es descriptiva y no reemplaza inventarios científicos o indicaciones de las autoridades ambientales.</small></section>
      <section className="town-places section"><div className="town-section-heading"><span className="eyebrow">PARA CONOCER EN EL MUNICIPIO</span><h2>Lugares que cuentan<br/><em>el territorio.</em></h2></div><div className="town-place-grid">{(town.places || '').split(';').filter(Boolean).map((place,index) => <article key={place}><span>0{index+1}</span><h3>{place.trim()}</h3><small>Puerto Escondido · Córdoba</small></article>)}</div></section>
      <section className="town-modern section"><div className="town-section-heading"><span className="eyebrow">EL MUNICIPIO HOY</span><h2>Un destino que sigue <em>cambiando.</em></h2><p>El muelle, las playas y la vida cotidiana conviven con la memoria de las comunidades.</p></div><div className="town-photo-grid modern-grid">{municipalityPhotos.map(photo => <figure className="town-photo-card modern-photo" key={photo.src}><img src={photo.src} alt={photo.caption} loading="lazy"/><figcaption><span>{photo.period}</span><b>{photo.caption}</b><small>Fotografía aportada para la guía turística</small></figcaption></figure>)}{townPhotos.filter(photo => !photo.isHistorical).map(photo => <figure className="town-photo-card modern-photo" key={photo.id}><img src={apiImage(photo.imageUrl)} alt={photo.caption} loading="lazy"/><figcaption><span>{photo.period}</span><b>{photo.caption}</b><small>{photo.sourceUrl ? <a href={photo.sourceUrl} target="_blank" rel="noreferrer">{photo.credit} ↗</a> : photo.credit}</small></figcaption></figure>)}</div></section>
      <section className="town-culture section" id="cultura"><div><span className="eyebrow">CULTURA VIVA</span><h2>El ritmo del<br/><em>bullerengue.</em></h2></div><div><p>{town.culture}</p><a href="https://www.cordobacolombia.com/rutas-corredores-turisticos/" target="_blank" rel="noreferrer">Rutas culturales de Córdoba ↗</a></div></section>
      <section className="town-sources"><span className="eyebrow">FUENTES Y CRÉDITOS</span><a href={town.wikipediaUrl || 'https://es.wikipedia.org/wiki/Puerto_Escondido_(C%C3%B3rdoba)'} target="_blank" rel="noreferrer">Wikipedia · Puerto Escondido (Córdoba) ↗</a><a href="https://cvs.gov.co/download/525/cambio-climatico/11687/fase_de_preparacion_y_planificacion.pdf" target="_blank" rel="noreferrer">CVS · Información ambiental de Córdoba ↗</a><a href="https://larazon.co/puerto-escondido-estrena-muelle-turistico-embellecido-con-colores-inspirados-en-el-bullerengue/" target="_blank" rel="noreferrer">La Razón · Foto del muelle, crédito Gobernación de Córdoba ↗</a><a href="https://www.chicanoticias.com/2025/06/24/colores-del-bullerengue-dan-nueva-vida-al-muelle-turistico-de-puerto-escondido/" target="_blank" rel="noreferrer">Chica Noticias · Imágenes del muelle en 2025 ↗</a><a href="https://www.pexels.com/photo/man-walking-through-water-at-puerto-escondido-38777121/" target="_blank" rel="noreferrer">Pexels · Israel Barrios Ríos ↗</a></section>
      <section className="town-cta"><span className="eyebrow light">PLANEA TU VISITA</span><h2>Descubre los lugares<br/>que hacen único este destino.</h2>{link('/lugares','Ver lugares y servicios →','cream-btn')}</section>
    </> : <section className="section"><p>{error || 'Cargando información del municipio…'}</p></section>}
  </main>{footer}</>;

  return <>{header}<main>
    <section className="hero" id="inicio"><div className="hero-image"/><div className="hero-shade"/><div className="hero-content"><span className="eyebrow light">CÓRDOBA · CARIBE COLOMBIANO</span><h1>Donde el mar<br/>te <em>encuentra.</em></h1><p>Un rincón sereno entre manglares, historias<br className="desktop"/> y sabores que se quedan contigo.</p><div className="hero-actions">{link('/lugares',<>Explora el destino <span>→</span></>,'cream-btn')}{link('/planea-tu-viaje','Planea tu viaje ↓','text-link')}</div></div><div className="hero-caption"><span>09° 02’ N &nbsp; 76° 11’ O</span><span>PUERTO ESCONDIDO</span><span className="photo-credit">Foto: Jose Arts</span></div><div className="hero-stamp">UN DESTINO<br/><b>con alma</b></div></section>
    <section className="search-wrap" id="explora"><div className="search-intro"><span className="eyebrow">ARMA TU ESCAPADA</span><h2>¿Qué te gustaría<br/><em>vivir hoy?</em></h2></div><div className="search-box"><label>Explora el destino</label><div className="search-row"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Un hotel, restaurante, experiencia…" onKeyDown={(event) => { if (event.key === 'Enter') go(directorySearchUrl()); }}/><button type="button" onClick={() => go(directorySearchUrl())}>Buscar <span>→</span></button></div><div className="home-search-actions"><div className="search-hint">✦ &nbsp; Lugares y servicios del directorio local</div><button type="button" className="home-filter-toggle" aria-expanded={advancedFiltersOpen} onClick={() => setAdvancedFiltersOpen((open) => !open)}>＋ Filtros {advancedFilterCount > 0 && <b>{advancedFilterCount}</b>}</button></div>{advancedFiltersOpen && <div className="home-advanced-filters">{advancedFilterPanel}</div>}</div></section>
    <section className="listing section" id="resultados"><div className="section-heading"><div><span className="eyebrow">HECHO PARA DESCUBRIR</span><h2>Un lugar para cada <em>plan.</em></h2></div>{link('/lugares','Ver más ↗','see-more-btn')}</div><div className="filters">{directoryCategories.map((item) => <button key={item} className={active === item ? 'filter active' : 'filter'} onClick={() => setActive(item)}>{item}</button>)}</div>{error && <p className="api-error">{error}</p>}<div className="cards">{filtered.slice(0,4).map((place) => card(place))}{!error && filtered.length === 0 && places.length === 0 && <p className="empty">Cargando lugares del directorio…</p>}</div><a className="home-transport-shortcut" href="/transportes" onClick={(event) => {event.preventDefault();go('/transportes');}}>¿Buscas cómo llegar? <b>Consulta transportes y rutas <span>→</span></b></a></section>
    <section className="story section" id="municipio"><div className="story-photo"><img src={picture(town?.coverImageUrl)} alt="Paisaje de Puerto Escondido"/><span className="photo-note">TERRITORIO DE MAR Y CIÉNAGA</span></div><div className="story-copy"><span className="eyebrow">MÁS QUE UN DESTINO</span><h2>Una historia que<br/>se vive <em>despacio.</em></h2><p>{town?.introduction || 'Puerto Escondido guarda la memoria de pescadores, caminos de agua y comunidades que han hecho del Caribe su hogar.'}</p><p>{town?.culture || 'Conoce sus paisajes, sus tradiciones y las personas que mantienen viva la esencia del territorio.'}</p>{municipalityLink()}<div className="story-note"><b>01 —</b> Naturaleza, cultura y comunidad</div></div></section>
    <section className="events-teaser"><a className="events-teaser-image" href="/eventos" onClick={(event) => {event.preventDefault();go('/eventos');}} style={{backgroundImage:`linear-gradient(0deg,rgba(12,32,27,.3),transparent),url('${eventImage}')`}} aria-label="Conocer la agenda cultural de Puerto Escondido"><span>AGENDA CULTURAL</span></a><div className="events-teaser-copy"><span className="eyebrow">UNA TRADICIÓN QUE NOS REÚNE</span><h2>El Puerto también<br/>se vive al <em>ritmo del tambor.</em></h2><p>Conoce el Festival Nacional del Bullerengue y revisa dónde consultar su próxima programación.</p>{link('/eventos','Ver eventos y cultura local →','under-link')}</div></section>
    <section className="planner-promo"><div><span className="eyebrow light">PLANEACIÓN, SIN COMPLICACIONES</span><h2>¿Un día, un fin de semana<br/>o más tiempo?</h2><p>Arma una ruta sugerida y encuentra en un solo lugar los accesos que necesitas antes de salir.</p>{link('/planea-tu-viaje',<>Planea tu viaje <span>→</span></>,'cream-btn')}</div><span className="planner-promo-mark">PE<br/><b>09° · 76°</b></span></section>
    <section className="host section"><div><span className="eyebrow">¿ERES DE AQUÍ?</span><h2>Tu negocio también<br/>hace parte de <em>la historia.</em></h2></div><div><p>Conecta tu hotel, restaurante o experiencia con viajeros que quieren conocer el Puerto Escondido auténtico.</p>{link('/registrar-negocio','Registra tu establecimiento ↗','under-link')}</div></section>
  </main>{footer}</>;
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
