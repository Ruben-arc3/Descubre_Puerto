import React, { useEffect, useMemo, useState } from 'react';
import { apiFetch } from './api';
import './business-wizard.css';
import OpenMapPicker from './OpenMapPicker';

type CategorySlug = 'hoteles' | 'restaurantes' | 'tours';
type OfferDraft = { name: string; description: string; price: string; priceUnit: string };
type MenuDraft = { name: string; category: string; description: string; price: string };
type BusinessDraft = {
  categorySlug: CategorySlug; name: string; zone: string; shortDescription: string; description: string;
  address: string; whatsappNumber: string; latitude: string; longitude: string; basePrice: string; priceUnit: string;
  checkInTime: string; checkOutTime: string; maxGuestsPerUnit: string; amenities: string;
  roomName: string; roomDescription: string; maxAdults: string; maxChildren: string; bedDescription: string;
  areaSqm: string; quantity: string; nightlyRate: string; breakfastIncluded: boolean; refundable: boolean;
  cancellationPolicy: string; prepaymentPolicy: string; roomAmenities: string;
  smokingAllowed: boolean; eventsAllowed: boolean; petsPolicy: 'ALLOWED' | 'ON_REQUEST' | 'NOT_ALLOWED';
  atmosphere: string; capacity: string; averageSpend: string; reservationRequired: boolean;
  closedDays: string; serviceOptions: string; paymentMethods: string; dietaryOptions: string; accessibilityInfo: string;
  durationMinutes: string; meetingPoint: string; minGroupSize: string; maxGroupSize: string; minAge: string;
  maxAge: string; included: string; requirements: string; physicalLevel: string; languages: string; schedules: string;
  tourCancellation: string; weatherPolicy: string;
};

const initialDraft = (categorySlug: CategorySlug): BusinessDraft => ({
  categorySlug, name: '', zone: '', shortDescription: '', description: '', address: '', whatsappNumber: '',
  latitude: '9.02', longitude: '-76.18', basePrice: '', priceUnit: categorySlug === 'hoteles' ? 'noche' : categorySlug === 'tours' ? 'persona' : 'plato',
  checkInTime: '15:00', checkOutTime: '11:00', maxGuestsPerUnit: '2', amenities: '', roomName: 'Habitación estándar',
  roomDescription: '', maxAdults: '2', maxChildren: '0', bedDescription: '', areaSqm: '', quantity: '1',
  nightlyRate: '', breakfastIncluded: false, refundable: true, cancellationPolicy: 'Cancelación flexible',
  prepaymentPolicy: 'Sin pago por adelantado', roomAmenities: '', smokingAllowed: false, eventsAllowed: false,
  petsPolicy: 'NOT_ALLOWED', atmosphere: '', capacity: '', averageSpend: '', reservationRequired: false,
  closedDays: '', serviceOptions: 'Atención en mesa, Para llevar', paymentMethods: 'Efectivo, Transferencia',
  dietaryOptions: '', accessibilityInfo: '', durationMinutes: '180', meetingPoint: '', minGroupSize: '1',
  maxGroupSize: '', minAge: '', maxAge: '', included: '', requirements: '', physicalLevel: 'Suave',
  languages: 'Español', schedules: '', tourCancellation: 'Consultar con el operador', weatherPolicy: '',
});

const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const splitList = (value: string) => value.split(',').map((part) => part.trim()).filter(Boolean);
const categoryNames: Record<CategorySlug, string> = { hoteles: 'Alojamiento', restaurantes: 'Restaurante', tours: 'Tour o experiencia' };

type Props = { api: string; initialCategorySlug: string; onBack: () => void; onCreated: (business: { id: string; name: string }) => void };

export default function BusinessRegistrationWizard({ api, initialCategorySlug, onBack, onCreated }: Props) {
  const normalizedCategory = (['hoteles', 'restaurantes', 'tours'].includes(initialCategorySlug) ? initialCategorySlug : 'hoteles') as CategorySlug;
  const [draft, setDraft] = useState<BusinessDraft>(() => initialDraft(normalizedCategory));
  const [step, setStep] = useState(0);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [menuItems, setMenuItems] = useState<MenuDraft[]>([{ name: '', category: '', description: '', price: '' }]);
  const [offers, setOffers] = useState<OfferDraft[]>([{ name: '', description: '', price: '', priceUnit: '' }]);
  const [openingHours, setOpeningHours] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const urls = files.map((file) => URL.createObjectURL(file));
    setPreviews(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [files]);

  const labels = draft.categorySlug === 'hoteles'
    ? ['Información general', 'Fotos', 'Alojamiento', 'Precio y normas', 'Revisar y finalizar']
    : draft.categorySlug === 'restaurantes'
      ? ['Información general', 'Fotos', 'Restaurante', 'Menú y precios', 'Revisar y finalizar']
      : ['Información general', 'Fotos', 'Experiencia', 'Qué ofrece el tour', 'Revisar y finalizar'];
  const progress = useMemo(() => ((step + 1) / labels.length) * 100, [step, labels.length]);
  const set = <K extends keyof BusinessDraft>(key: K, value: BusinessDraft[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const input = (key: keyof BusinessDraft, label: string, placeholder = '', props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className={props.className || ''}>{label}<input {...props} className={undefined} value={draft[key] as string} onChange={(event) => set(key, event.target.value as BusinessDraft[typeof key])} placeholder={placeholder}/></label>
  );
  const text = (key: keyof BusinessDraft, label: string, placeholder = '', rows = 4) => (
    <label className="wizard-field-wide">{label}<textarea rows={rows} value={draft[key] as string} onChange={(event) => set(key, event.target.value as BusinessDraft[typeof key])} placeholder={placeholder}/></label>
  );
  const checkbox = (key: keyof BusinessDraft, label: string) => (
    <label className="wizard-check"><input type="checkbox" checked={Boolean(draft[key])} onChange={(event) => set(key, event.target.checked as BusinessDraft[typeof key])}/><span>{label}</span></label>
  );

  const canContinue = () => {
    setError('');
    if (step === 0) {
      const missing = [
        [draft.name.trim().length >= 3, 'nombre comercial (3 caracteres)'],
        [draft.zone.trim().length >= 2, 'zona o localidad'],
        [draft.shortDescription.trim().length >= 5, 'descripción breve'],
        [draft.description.trim().length >= 20, 'descripción (mínimo 20 caracteres)'],
        [draft.address.trim().length >= 5, 'dirección o referencia'],
        [draft.whatsappNumber.trim().length >= 7, 'WhatsApp de contacto'],
        [Number.isFinite(Number(draft.latitude)) && Math.abs(Number(draft.latitude)) <= 90, 'latitud válida'],
        [Number.isFinite(Number(draft.longitude)) && Math.abs(Number(draft.longitude)) <= 180, 'longitud válida'],
      ].filter(([valid]) => !valid).map(([, label]) => label);
      if (missing.length) { setError(`Completa estos datos para continuar: ${missing.join(', ')}.`); return false; }
    }
    if (step === 2 && draft.categorySlug === 'hoteles') {
      if (!draft.roomName.trim() || draft.roomDescription.trim().length < 5 || !draft.bedDescription.trim()) {
        setError('Describe al menos un tipo de habitación: nombre, descripción y tipo de cama.'); return false;
      }
    }
    if (step === 3 && draft.categorySlug === 'hoteles') {
      if (!(Number(draft.nightlyRate) > 0)) { setError('Indica la tarifa por noche del primer tipo de habitación.'); return false; }
    }
    if (step === 2 && draft.categorySlug === 'tours') {
      if (!(Number(draft.durationMinutes) > 0) || draft.meetingPoint.trim().length < 3) {
        setError('Indica cuánto dura la experiencia y dónde se encuentran.'); return false;
      }
    }
    if (step === 3 && draft.categorySlug === 'tours') {
      if (!offers.some((offer) => offer.name.trim() && Number(offer.price) > 0)) {
        setError('Agrega al menos una actividad o modalidad con su precio.'); return false;
      }
    }
    return true;
  };

  const request = async <T,>(path: string, method: string, body: unknown): Promise<T> => {
    const response = await apiFetch(`${api}${path}`, { method, headers: { 'Content-Type': 'application/json', }, body: JSON.stringify(body) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error?.message || `No se pudo guardar ${path}.`);
    return result.data as T;
  };

  const register = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(''); setMessage(''); setSaving(true);
    let created: { id: string; name: string } | null = null;
    try {
      created = await request<{ id: string; name: string }>('/hotel-management', 'POST', {
        ...draft, latitude: Number(draft.latitude), longitude: Number(draft.longitude),
        basePrice: draft.categorySlug === 'hoteles'
          ? Number(draft.nightlyRate)
          : draft.basePrice ? Number(draft.basePrice)
            : draft.categorySlug === 'restaurantes' && draft.averageSpend ? Number(draft.averageSpend)
              : draft.categorySlug === 'tours' && offers.find((offer) => Number(offer.price) > 0) ? Number(offers.find((offer) => Number(offer.price) > 0)!.price) : null,
        priceUnit: draft.categorySlug === 'hoteles' ? 'noche' : draft.priceUnit || (draft.categorySlug === 'tours' ? offers.find((offer) => Number(offer.price) > 0)?.priceUnit || 'persona' : 'plato'),
      });
      onCreated(created);

      if (draft.categorySlug === 'hoteles') {
        await request(`/hotel-management/${created.id}/details`, 'PUT', {
          checkInTime: draft.checkInTime || null, checkOutTime: draft.checkOutTime || null,
          maxGuestsPerUnit: Number(draft.maxGuestsPerUnit) || null, amenities: splitList(draft.amenities),
          smokingAllowed: draft.smokingAllowed, eventsAllowed: draft.eventsAllowed, petsPolicy: draft.petsPolicy,
        });
        await request(`/hotel-management/${created.id}/rooms`, 'POST', {
          name: draft.roomName, description: draft.roomDescription, maxAdults: Number(draft.maxAdults),
          maxChildren: Number(draft.maxChildren), bedDescription: draft.bedDescription,
          areaSqm: draft.areaSqm ? Number(draft.areaSqm) : null, quantity: Number(draft.quantity),
          nightlyRate: Number(draft.nightlyRate), breakfastIncluded: draft.breakfastIncluded,
          refundable: draft.refundable, cancellationPolicy: draft.cancellationPolicy,
          prepaymentPolicy: draft.prepaymentPolicy, amenities: splitList(draft.roomAmenities), isAvailable: true,
        });
      } else if (draft.categorySlug === 'restaurantes') {
        const hours = Object.fromEntries(Object.entries(openingHours).filter(([, value]) => value.trim()));
        await request(`/hotel-management/${created.id}/details`, 'PUT', {
          openingHours: hours, closedDays: splitList(draft.closedDays), serviceOptions: splitList(draft.serviceOptions),
          paymentMethods: splitList(draft.paymentMethods), dietaryOptions: splitList(draft.dietaryOptions),
          atmosphere: draft.atmosphere || null, capacity: draft.capacity ? Number(draft.capacity) : null,
          averageSpend: draft.averageSpend ? Number(draft.averageSpend) : null, reservationRequired: draft.reservationRequired,
          accessibilityInfo: draft.accessibilityInfo || null,
        });
        for (const item of menuItems.filter((menuItem) => menuItem.name.trim() && Number(menuItem.price) > 0)) {
          await request(`/hotel-management/${created.id}/menu-items`, 'POST', {
            ...item, price: Number(item.price), description: item.description || undefined, category: item.category || undefined,
          });
        }
        for (const offer of offers.filter((item) => item.name.trim())) {
          await request(`/hotel-management/${created.id}/services`, 'POST', {
            ...offer, price: offer.price ? Number(offer.price) : null, description: offer.description || undefined, priceUnit: offer.priceUnit || undefined,
          });
        }
      } else {
        await request(`/hotel-management/${created.id}/details`, 'PUT', {
          durationMinutes: Number(draft.durationMinutes), schedules: splitList(draft.schedules),
          meetingPoint: draft.meetingPoint, minGroupSize: Number(draft.minGroupSize) || 1,
          maxGroupSize: draft.maxGroupSize ? Number(draft.maxGroupSize) : null,
          minAge: draft.minAge ? Number(draft.minAge) : null, maxAge: draft.maxAge ? Number(draft.maxAge) : null,
          included: splitList(draft.included), requirements: splitList(draft.requirements), physicalLevel: draft.physicalLevel,
          languages: splitList(draft.languages), cancellationPolicy: draft.tourCancellation,
          weatherPolicy: draft.weatherPolicy || null, accessibilityInfo: draft.accessibilityInfo || null,
        });
        for (const offer of offers.filter((item) => item.name.trim() && Number(item.price) > 0)) {
          await request(`/hotel-management/${created.id}/services`, 'POST', { ...offer, price: Number(offer.price), description: offer.description || undefined, priceUnit: offer.priceUnit || draft.priceUnit || undefined });
        }
      }

      const imageFailures: string[] = [];
      for (const [index, file] of files.entries()) {
        try {
          const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader(); reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('No se pudo leer la imagen.'));
            reader.onerror = () => reject(new Error('No se pudo leer la imagen.')); reader.readAsDataURL(file);
          });
          const response = await apiFetch(`${api}/hotel-management/${created.id}/media`, {
            method: 'POST', headers: { 'Content-Type': 'application/json', },
            body: JSON.stringify({ mimeType: file.type, fileName: file.name, imageBase64: dataUrl.split(',')[1] || '', isCover: index === 0 }),
          });
          if (!response.ok) imageFailures.push(file.name);
        } catch { imageFailures.push(file.name); }
      }
      onCreated(created);
      setMessage(`${created.name} quedó registrado y pendiente de revisión.${imageFailures.length ? ` No pudimos guardar: ${imageFailures.join(', ')}.` : files.length ? ` Se guardaron ${files.length} ${files.length === 1 ? 'foto' : 'fotos'}.` : ' Puedes agregar fotografías más adelante desde tu panel.'}`);
      setStep(4);
    } catch (problem) {
      if (created) {
        onCreated(created);
        setMessage(`${created.name} quedó guardado como pendiente, pero uno de sus detalles no pudo registrarse. Revisa el panel de anfitrión para completarlo.`);
        setStep(4);
        setError('');
      } else setError(problem instanceof Error ? problem.message : 'No se pudo registrar el establecimiento.');
    } finally { setSaving(false); }
  };

  const addFiles = (incoming: FileList | null) => {
    if (!incoming) return;
    const selected = Array.from(incoming);
    if (selected.some((file) => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type))) { setError('Usa imágenes JPG, PNG o WebP.'); return; }
    if (selected.some((file) => file.size > 5 * 1024 * 1024)) { setError('Cada imagen puede pesar hasta 5 MB.'); return; }
    if (files.length + selected.length > 8) { setError('Puedes cargar hasta 8 fotos.'); return; }
    setError(''); setFiles((current) => [...current, ...selected]);
  };

  const renderGeneral = () => <div className="wizard-panel-grid">
    <div className="wizard-panel-intro"><span className="wizard-kicker">PRESENTACIÓN</span><h2>Cuéntanos de tu negocio.</h2><p>Esta información permitirá que visitantes y residentes te encuentren y sepan qué ofreces.</p><div className="wizard-tip">✦ &nbsp; Describe tu propuesta con palabras que usarías para invitar a alguien a conocerla.</div></div>
    <div className="wizard-fields">
      <label>Tipo de establecimiento<select value={draft.categorySlug} onChange={(event) => { const value = event.target.value as CategorySlug; set('categorySlug', value); set('priceUnit', value === 'hoteles' ? 'noche' : value === 'tours' ? 'persona' : 'plato'); }}>{Object.entries(categoryNames).map(([key, value]) => <option key={key} value={key}>{value}</option>)}</select></label>
      {input('name', 'Nombre comercial', 'Ej. Posada Brisa Marina')}{input('zone', 'Zona o localidad', 'Centro, Playa, El Prieto…')}
      {input('shortDescription', 'Descripción breve', 'Una frase que te haga destacar', { maxLength: 160, className: 'wizard-field-wide' })}
      {text('description', 'Descripción completa', 'Describe tu espacio, tu cocina o la experiencia que ofreces.', 4)}
      {input('whatsappNumber', 'WhatsApp de contacto', '+57 300 000 0000', { type: 'tel' })}
      <div className="wizard-field-wide wizard-map-section"><b>Ubicación del establecimiento</b><small>Busca una referencia y ajusta el pin directamente en el mapa.</small><OpenMapPicker api={api} latitude={draft.latitude} longitude={draft.longitude} address={draft.address} onSelect={(latitude,longitude,address) => setDraft((current) => ({...current,latitude,longitude,...(address !== undefined ? {address} : {})}))}/></div>
    </div>
  </div>;

  const renderAccommodation = () => <div className="wizard-panel-grid">
    <div className="wizard-panel-intro"><span className="wizard-kicker">DETALLES DEL ALOJAMIENTO</span><h2>¿Cómo es el lugar?</h2><p>Describe las comodidades generales y las reglas que tus huéspedes deben conocer.</p><div className="wizard-tip">Las habitaciones y sus tarifas aparecerán en la ficha pública del alojamiento.</div></div>
    <div className="wizard-fields">{input('maxGuestsPerUnit', 'Capacidad máxima por habitación', '2', { type: 'number', min: 1 })}{input('checkInTime', 'Hora de entrada', '', { type: 'time' })}{input('checkOutTime', 'Hora de salida', '', { type: 'time' })}{input('amenities', 'Comodidades del alojamiento', 'Piscina, Wi-Fi, desayuno incluido', { className: 'wizard-field-wide' })}
      <div className="wizard-field-wide wizard-subheading"><span>Primer tipo de habitación</span><small>Podrás añadir más habitaciones después.</small></div>
      {input('roomName', 'Nombre de la habitación', 'Habitación doble estándar')}{input('bedDescription', 'Camas', '1 cama doble')}
      {text('roomDescription', 'Descripción', 'Qué incluye esta habitación y qué la hace cómoda.', 3)}
      {input('maxAdults', 'Adultos', '2', { type: 'number', min: 1 })}{input('maxChildren', 'Niños', '0', { type: 'number', min: 0 })}
      {input('areaSqm', 'Área (m²)', 'Opcional', { type: 'number', min: 1 })}{input('quantity', 'Unidades disponibles', '1', { type: 'number', min: 1 })}
      {input('roomAmenities', 'Comodidades de esta habitación', 'Aire acondicionado, baño privado', { className: 'wizard-field-wide' })}
    </div>
  </div>;

  const renderRestaurant = () => <div className="wizard-panel-grid">
    <div className="wizard-panel-intro"><span className="wizard-kicker">INFORMACIÓN DEL RESTAURANTE</span><h2>Presenta tus sabores.</h2><p>Agrega horarios, ambiente, opciones de servicio y medios de pago para que cada visita empiece con claridad.</p><div className="wizard-tip">Los horarios se pueden dejar vacíos y completar más tarde.</div></div>
    <div className="wizard-fields">
      {input('atmosphere', 'Ambiente', 'Familiar, frente al mar, informal')}{input('capacity', 'Capacidad de personas', '30', { type: 'number', min: 1 })}
      {input('closedDays', 'Días de cierre', 'Domingo, festivos')}{input('serviceOptions', 'Modalidades de servicio', 'En mesa, Para llevar, Domicilio')}
      {input('paymentMethods', 'Medios de pago', 'Efectivo, transferencia, tarjeta')}{input('dietaryOptions', 'Opciones alimentarias', 'Vegetariano, vegano, sin gluten')}
      {input('averageSpend', 'Consumo promedio por persona (COP)', '35000', { type: 'number', min: 0 })}
      <label className="wizard-field-wide">Accesibilidad y otras notas<textarea rows={3} value={draft.accessibilityInfo} onChange={(event) => set('accessibilityInfo', event.target.value)} placeholder="Acceso para silla de ruedas, sillas para niños…"/></label>
      <div className="wizard-field-wide wizard-hours"><b>Horario por día</b><div>{days.map((day) => <label key={day}><span>{day}</span><input aria-label={`Horario ${day}`} value={openingHours[day] || ''} onChange={(event) => setOpeningHours((hours) => ({ ...hours, [day]: event.target.value }))} placeholder="12:00–21:00"/></label>)}</div></div>
      {checkbox('reservationRequired', 'Se recomienda o requiere reservar')}
    </div>
  </div>;

  const renderTour = () => <div className="wizard-panel-grid">
    <div className="wizard-panel-intro"><span className="wizard-kicker">DISEÑA LA EXPERIENCIA</span><h2>¿Cómo se vive tu tour?</h2><p>Cuéntale al viajero cuánto dura, dónde comienza y qué debe tener en cuenta antes de salir.</p><div className="wizard-tip">Incluye solo detalles que la persona necesite conocer antes de reservar.</div></div>
    <div className="wizard-fields">
      {input('durationMinutes', 'Duración (minutos)', '180', { type: 'number', min: 1 })}{input('meetingPoint', 'Punto de encuentro', 'Muelle, plaza principal, hotel…')}
      {input('minGroupSize', 'Grupo mínimo', '1', { type: 'number', min: 1 })}{input('maxGroupSize', 'Grupo máximo', 'Opcional', { type: 'number', min: 1 })}
      {input('minAge', 'Edad mínima', 'Opcional', { type: 'number', min: 0 })}{input('maxAge', 'Edad máxima', 'Opcional', { type: 'number', min: 0 })}
      {input('physicalLevel', 'Nivel de esfuerzo', 'Suave, moderado o exigente')}{input('languages', 'Idiomas', 'Español, inglés')}
      {input('accessibilityInfo', 'Accesibilidad', 'Indica si hay limitaciones de acceso')}
      {input('schedules', 'Horarios o salidas', '8:00 a. m., 2:00 p. m.', { className: 'wizard-field-wide' })}
    </div>
  </div>;

  const renderOffer = () => draft.categorySlug === 'hoteles' ? <div className="wizard-panel-grid">
    <div className="wizard-panel-intro"><span className="wizard-kicker">TARIFA Y REGLAS</span><h2>Deja claras las condiciones.</h2><p>Esta tarifa será la referencia de la primera habitación que publicarás.</p></div>
    <div className="wizard-fields">{input('nightlyRate', 'Precio por noche (COP)', '185000', { type: 'number', min: 1 })}
      <div className="wizard-field-wide wizard-rule-card"><b>Normas del alojamiento</b>{checkbox('smokingAllowed', 'Está permitido fumar')}{checkbox('eventsAllowed', 'Se pueden celebrar reuniones o eventos')}
        <label>Política de mascotas<select value={draft.petsPolicy} onChange={(event) => set('petsPolicy', event.target.value as BusinessDraft['petsPolicy'])}><option value="NOT_ALLOWED">No se admiten</option><option value="ON_REQUEST">Bajo petición</option><option value="ALLOWED">Se admiten</option></select></label>
      </div>
      <div className="wizard-field-wide wizard-rule-card"><b>Pagos y cancelaciones</b>{checkbox('breakfastIncluded', 'El desayuno está incluido')}{checkbox('refundable', 'Tarifa reembolsable')}{input('cancellationPolicy', 'Política de cancelación', 'Cancelación flexible')}{input('prepaymentPolicy', 'Pago anticipado', 'Sin pago por adelantado')}</div>
    </div>
  </div> : draft.categorySlug === 'restaurantes' ? <div className="wizard-panel-grid">
    <div className="wizard-panel-intro"><span className="wizard-kicker">CARTA Y PRECIOS</span><h2>¿Qué se puede probar?</h2><p>Incluye algunos platos representativos. Puedes agregar la carta completa desde el panel después.</p></div>
    <div className="wizard-fields wizard-list-fields">{menuItems.map((item, index) => <article className="wizard-dynamic-card wizard-field-wide" key={`menu-${index}`}><div className="wizard-dynamic-heading"><b>Plato {index + 1}</b>{menuItems.length > 1 && <button type="button" onClick={() => setMenuItems((items) => items.filter((_, itemIndex) => itemIndex !== index))}>Quitar</button>}</div><div className="wizard-inline-fields"><label>Nombre<input value={item.name} onChange={(event) => setMenuItems((items) => items.map((entry, i) => i === index ? { ...entry, name: event.target.value } : entry))} placeholder="Pargo frito con patacón"/></label><label>Categoría<input value={item.category} onChange={(event) => setMenuItems((items) => items.map((entry, i) => i === index ? { ...entry, category: event.target.value } : entry))} placeholder="Plato fuerte"/></label><label>Precio (COP)<input type="number" min="1" value={item.price} onChange={(event) => setMenuItems((items) => items.map((entry, i) => i === index ? { ...entry, price: event.target.value } : entry))} placeholder="35000"/></label><label className="wizard-field-wide">Descripción<input value={item.description} onChange={(event) => setMenuItems((items) => items.map((entry, i) => i === index ? { ...entry, description: event.target.value } : entry))} placeholder="Acompañamientos, tamaño, ingredientes…"/></label></div></article>)}<button type="button" className="wizard-add-row wizard-field-wide" onClick={() => setMenuItems((items) => [...items, { name: '', category: '', description: '', price: '' }])}>＋ Agregar un plato</button>
      <div className="wizard-subheading wizard-field-wide"><span>Otros servicios</span><small>Reservas, eventos, domicilio u ofertas adicionales.</small></div>
      {offers.map((offer, index) => <article className="wizard-dynamic-card wizard-field-wide" key={`offer-${index}`}><div className="wizard-inline-fields"><label>Servicio<input value={offer.name} onChange={(event) => setOffers((items) => items.map((entry, i) => i === index ? { ...entry, name: event.target.value } : entry))} placeholder="Domicilio, desayuno, evento…"/></label><label>Precio (opcional)<input type="number" min="1" value={offer.price} onChange={(event) => setOffers((items) => items.map((entry, i) => i === index ? { ...entry, price: event.target.value } : entry))} placeholder="Consultar"/></label><label className="wizard-field-wide">Descripción<input value={offer.description} onChange={(event) => setOffers((items) => items.map((entry, i) => i === index ? { ...entry, description: event.target.value } : entry))} placeholder="Detalles del servicio"/></label></div></article>)}<button type="button" className="wizard-add-row wizard-field-wide" onClick={() => setOffers((items) => [...items, { name: '', description: '', price: '', priceUnit: '' }])}>＋ Agregar otro servicio</button>
    </div>
  </div> : <div className="wizard-panel-grid">
    <div className="wizard-panel-intro"><span className="wizard-kicker">SALIDAS Y MODALIDADES</span><h2>Arma tu oferta.</h2><p>Registra modalidades concretas para que el visitante compare y consulte tu experiencia.</p></div>
    <div className="wizard-fields wizard-list-fields">{input('basePrice', 'Precio de referencia (COP)', '90000', { type: 'number', min: 1 })}{input('priceUnit', 'Unidad de cobro', 'Por persona o por grupo')}
      {offers.map((offer, index) => <article className="wizard-dynamic-card wizard-field-wide" key={`tour-offer-${index}`}><div className="wizard-dynamic-heading"><b>Modalidad {index + 1}</b>{offers.length > 1 && <button type="button" onClick={() => setOffers((items) => items.filter((_, itemIndex) => itemIndex !== index))}>Quitar</button>}</div><div className="wizard-inline-fields"><label>Nombre<input value={offer.name} onChange={(event) => setOffers((items) => items.map((entry, i) => i === index ? { ...entry, name: event.target.value } : entry))} placeholder="Paseo en canoa por el manglar"/></label><label>Precio (COP)<input required type="number" min="1" value={offer.price} onChange={(event) => setOffers((items) => items.map((entry, i) => i === index ? { ...entry, price: event.target.value } : entry))} placeholder="90000"/></label><label>Se cobra por<input value={offer.priceUnit} onChange={(event) => setOffers((items) => items.map((entry, i) => i === index ? { ...entry, priceUnit: event.target.value } : entry))} placeholder="persona"/></label><label className="wizard-field-wide">Descripción<input value={offer.description} onChange={(event) => setOffers((items) => items.map((entry, i) => i === index ? { ...entry, description: event.target.value } : entry))} placeholder="Qué verá o hará el grupo"/></label></div></article>)}<button type="button" className="wizard-add-row wizard-field-wide" onClick={() => setOffers((items) => [...items, { name: '', description: '', price: '', priceUnit: '' }])}>＋ Agregar otra modalidad</button>
      {input('included', 'Incluye', 'Guía local, transporte, refrigerio', { className: 'wizard-field-wide' })}{input('requirements', 'Qué llevar o requisitos', 'Ropa cómoda, protector solar', { className: 'wizard-field-wide' })}{input('tourCancellation', 'Política de cancelación', 'Consultar con el operador')}{input('weatherPolicy', 'Política por clima', 'Se reprograma si llueve fuerte')}
    </div>
  </div>;

  const renderReview = () => <div className="wizard-review"><div><span className="wizard-kicker">REPASO FINAL</span><h2>Así verán tu propuesta.</h2><p>Revisa los datos antes de enviar el establecimiento a revisión.</p></div><div className="wizard-review-grid"><article><small>ESTABLECIMIENTO</small><h3>{draft.name || 'Nombre de tu negocio'}</h3><p>{categoryNames[draft.categorySlug]} · {draft.zone || 'Zona'}</p><p>{draft.shortDescription}</p><b>{draft.whatsappNumber}</b></article><article><small>UBICACIÓN</small><h3>{draft.address || 'Dirección o referencia'}</h3><p>{draft.latitude}, {draft.longitude}</p></article><article><small>OFERTA</small><h3>{draft.categorySlug === 'hoteles' ? draft.roomName : draft.categorySlug === 'restaurantes' ? menuItems.find((item) => item.name)?.name || 'Carta por completar' : offers.find((item) => item.name)?.name || 'Tour'}</h3><p>{draft.categorySlug === 'hoteles' ? `${draft.nightlyRate ? Number(draft.nightlyRate).toLocaleString('es-CO') : ''} COP / noche` : draft.categorySlug === 'restaurantes' ? 'Menú y servicios del restaurante' : `${draft.durationMinutes} min · ${draft.meetingPoint}`}</p></article><article><small>CONTENIDO</small><h3>{files.length} {files.length === 1 ? 'fotografía' : 'fotografías'}</h3><p>El perfil quedará pendiente de validación antes de publicarse.</p></article></div></div>;

  const renderStep = () => {
    if (step === 0) return renderGeneral();
    if (step === 1) return <div className="wizard-panel-grid"><div className="wizard-panel-intro"><span className="wizard-kicker">FOTOGRAFÍAS</span><h2>Muéstrales el lugar.</h2><p>Sube fotos propias y con buena luz. La primera será la portada de tu ficha.</p><div className="wizard-tip">JPG, PNG o WebP · hasta 5 MB cada una · máximo 8 fotos.</div></div><div className="wizard-photo-panel"><label className="wizard-dropzone"><span className="wizard-photo-icon">▧</span><b>Arrastra o selecciona tus fotos</b><small>Las imágenes se guardan en la base de datos del proyecto.</small><span className="wizard-file-button">＋ Cargar fotos</span><input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => { addFiles(event.target.files); event.target.value = ''; }}/></label><div className="wizard-photo-grid">{previews.map((src, index) => <figure key={`${src}-${index}`}><img src={src} alt={`Vista previa ${index + 1}`}/><figcaption>{index === 0 ? 'Portada' : `Foto ${index + 1}`}<button type="button" onClick={() => setFiles((items) => items.filter((_, itemIndex) => itemIndex !== index))}>×</button></figcaption></figure>)}</div></div></div>;
    if (step === 2) return draft.categorySlug === 'hoteles' ? renderAccommodation() : draft.categorySlug === 'restaurantes' ? renderRestaurant() : renderTour();
    if (step === 3) return renderOffer();
    return message ? <div className="wizard-finished"><span>✓</span><h2>Solicitud enviada.</h2><p>{message}</p><button type="button" onClick={onBack}>Volver al registro de negocios →</button></div> : renderReview();
  };

  return <div className="business-wizard">
    <header className="wizard-progress"><div className="wizard-progress-top"><button type="button" className="wizard-exit" onClick={onBack}>← <span>Salir del registro</span></button><span>PASO {String(step + 1).padStart(2, '0')} <i>/</i> 05</span></div><div className="wizard-progress-track"><span style={{ width: `${progress}%` }}/></div><nav aria-label="Pasos del registro">{labels.map((label, index) => <button key={label} type="button" className={index === step ? 'active' : index < step ? 'complete' : ''} onClick={() => { if (index < step) { setError(''); setStep(index); } }} aria-current={index === step ? 'step' : undefined}><i>{index < step ? '✓' : `0${index + 1}`}</i><span>{label}</span></button>)}</nav></header>
    <main className="wizard-content"><div className="wizard-step-heading"><div><span className="wizard-kicker">{categoryNames[draft.categorySlug].toUpperCase()} · PUERTO ESCONDIDO</span><h1>{labels[step]}</h1></div>{step < 4 && <span className="wizard-required-note">* Información necesaria para continuar</span>}</div>
      <form noValidate onSubmit={register}>
        <section className="wizard-step-view" key={`${draft.categorySlug}-${step}`}>{renderStep()}</section>
        {error && <div className="wizard-error" role="alert">{error}</div>}
        {step < 4 && <div className="wizard-footer"><button type="button" className="wizard-back" onClick={() => { setError(''); if (step === 0) onBack(); else setStep((value) => value - 1); }}>← <span>Anterior</span></button><span className="wizard-save-note">Puedes guardar tus cambios al terminar este paso.</span><button type="button" className="wizard-next" onClick={() => { if (canContinue()) setStep((value) => value + 1); }}>Continuar <span>→</span></button></div>}
        {step === 4 && !message && <div className="wizard-footer"><button type="button" className="wizard-back" onClick={() => setStep(3)}>← <span>Anterior</span></button><span className="wizard-save-note">Tu ficha se guardará como pendiente de revisión.</span><button type="submit" className="wizard-next" disabled={saving}>{saving ? 'Enviando solicitud…' : 'Enviar a revisión'} <span>→</span></button></div>}
      </form>
    </main>
  </div>;
}
