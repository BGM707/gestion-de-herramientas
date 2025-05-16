// Constantes
const TOOL_CATEGORIES = ['Eléctrica', 'Manual', 'Hidráulica', 'Neumática', 'Medición', 'Seguridad'];
const FUEL_TYPES = ['93 Octanos', '95 Octanos', '97 Octanos', 'Diesel', 'Kerosene', 'Gas'];
const TOOL_STATUSES = ['Disponible', 'Prestado', 'En mantenimiento', 'Dañado', 'Perdido'];
const LOCATIONS = ['Bodega A', 'Bodega B', 'Taller', 'Campo', 'Oficina'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const VALID_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/bmp', 'image/webp', 'image/svg+xml', 'image/tiff', 'image/heic', 'image/heif', 'image/avif'];

// Estructuras de datos
let tools = [];
let fuels = [];
let history = [];
let fuelHistory = [];
let currentTool = null;
let currentFuel = null;
let settings = {
  toolCategories: [...TOOL_CATEGORIES],
  fuelTypes: [...FUEL_TYPES],
  toolStatuses: [...TOOL_STATUSES],
  locations: [...LOCATIONS]
};

// Validaciones
function validateName(name, existingItems, currentId = null) {
  if (!name || name.trim().length < 3 || name.trim().length > 50) {
    return 'El nombre debe tener entre 3 y 50 caracteres.';
  }
  const isDuplicate = existingItems.some(item =>
    item.name.toLowerCase() === name.trim().toLowerCase() &&
    (currentId === null || item.id !== currentId)
  );
  return isDuplicate ? 'El nombre ya existe.' : null;
}

function validateQuantity(quantity, max, unit) {
  const parsed = parseFloat(quantity);
  if (isNaN(parsed) || parsed < 0 || parsed > max) {
    return `La cantidad debe estar entre 0 y ${max} ${unit}.`;
  }
  return null;
}

function validateWeight(weight) {
  const parsed = parseFloat(weight);
  if (isNaN(parsed) || parsed < 0 || parsed > 100) {
    return 'El peso debe estar entre 0 y 100 kg.';
  }
  return null;
}

function validateAmount(amount) {
  const parsed = parseFloat(amount);
  if (isNaN(parsed) || parsed < 0 || parsed > 1000000) {
    return 'El monto debe estar entre 0 y 1,000,000.';
  }
  return null;
}

function validateDate(dateStr) {
  if (!dateStr) {
    return 'La fecha es obligatoria.';
  }
  const date = new Date(dateStr);
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  if (isNaN(date.getTime()) || date > today) {
    return 'La fecha debe ser válida y no futura.';
  }
  return null;
}

function validateImage(file) {
  if (!file) return null;
  if (!VALID_IMAGE_TYPES.includes(file.type)) {
    return 'La imagen debe ser JPEG o PNG.';
  }
  if (file.size > MAX_FILE_SIZE) {
    return 'La imagen no debe exceder los 5 MB.';
  }
  return null;
}

function validateCategory(category) {
  if (!category || category.trim().length < 1) {
    return 'La categoría es obligatoria.';
  }
  return null;
}

function validateStatus(status) {
  if (!settings.toolStatuses.includes(status)) {
    return 'El estado no es válido.';
  }
  return null;
}

function validateLocation(location) {
  if (!settings.locations.includes(location)) {
    return 'La ubicación no es válida.';
  }
  return null;
}

function validateOdometer(odometer) {
  const parsed = parseInt(odometer);
  if (odometer && (isNaN(parsed) || parsed < 0)) {
    return 'El kilometraje debe ser un número positivo.';
  }
  return null;
}

// Funciones de inicialización
function initSettings() {
  const savedSettings = localStorage.getItem('settings');
  if (savedSettings) {
    settings = JSON.parse(savedSettings);
  } else {
    saveSettings();
  }
  renderSettings();
  updateFormOptions();
}

function renderSettings() {
  const toolCategoriesContainer = document.getElementById('toolCategories');
  toolCategoriesContainer.innerHTML = '';
  settings.toolCategories.forEach(category => {
    const chip = document.createElement('div');
    chip.className = 'bg-gray-200 px-3 py-1 rounded-full flex items-center';
    chip.innerHTML = `
      ${category}
      <button class="ml-2 text-red-500" onclick="removeToolCategory('${category}')">
        <i class="fas fa-times"></i>
      </button>
    `;
    toolCategoriesContainer.appendChild(chip);
  });

  const fuelTypesContainer = document.getElementById('fuelTypes');
  fuelTypesContainer.innerHTML = '';
  settings.fuelTypes.forEach(type => {
    const chip = document.createElement('div');
    chip.className = 'bg-gray-200 px-3 py-1 rounded-full flex items-center';
    chip.innerHTML = `
      ${type}
      <button class="ml-2 text-red-500" onclick="removeFuelType('${type}')">
        <i class="fas fa-times"></i>
      </button>
    `;
    fuelTypesContainer.appendChild(chip);
  });
}

function updateFormOptions() {
  const toolCategorySelect = document.getElementById('toolCategory');
  const toolStatusSelect = document.getElementById('toolStatus');
  const toolLocationSelect = document.getElementById('toolLocation');
  const fuelTypeSelect = document.getElementById('fuelType');
  const fuelTypeFilter = document.getElementById('fuelTypeFilter');

  toolCategorySelect.innerHTML = settings.toolCategories.map(cat => `<option value="${cat}">${cat}</option>`).join('');
  toolStatusSelect.innerHTML = settings.toolStatuses.map(status => `<option value="${status}">${status}</option>`).join('');
  toolLocationSelect.innerHTML = settings.locations.map(loc => `<option value="${loc}">${loc}</option>`).join('');
  fuelTypeSelect.innerHTML = `<option value="" disabled selected>Seleccione tipo de bencina</option>` + 
                            settings.fuelTypes.map(type => `<option value="${type}">${type}</option>`).join('');
  fuelTypeFilter.innerHTML = `<option value="">Todos los tipos</option>` + 
                            settings.fuelTypes.map(type => `<option value="${type}">${type}</option>`).join('');
}

// Funciones para manejar categorías
function addToolCategory() {
  const input = document.getElementById('newToolCategory');
  const category = input.value.trim();
  if (category && !settings.toolCategories.includes(category)) {
    settings.toolCategories.push(category);
    saveSettings();
    renderSettings();
    updateFormOptions();
    input.value = '';
    Swal.fire({
      icon: 'success',
      title: 'Categoría Agregada',
      text: `La categoría "${category}" ha sido agregada.`,
      timer: 1500
    });
  } else {
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: category ? 'La categoría ya existe.' : 'Por favor, ingrese una categoría válida.'
    });
  }
}

function removeToolCategory(category) {
  Swal.fire({
    title: '¿Estás seguro?',
    text: `Se eliminará la categoría "${category}".`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Eliminar',
    cancelButtonText: 'Cancelar'
  }).then(result => {
    if (result.isConfirmed) {
      settings.toolCategories = settings.toolCategories.filter(c => c !== category);
      tools.forEach(tool => {
        if (tool.category === category) tool.category = 'General';
      });
      saveSettings();
      saveTools();
      renderSettings();
      updateFormOptions();
      renderTools();
      Swal.fire({
        icon: 'success',
        title: 'Categoría Eliminada',
        text: `La categoría "${category}" ha sido eliminada.`,
        timer: 1500
      });
    }
  });
}

function addFuelType() {
  const input = document.getElementById('newFuelType');
  const type = input.value.trim();
  if (type && !settings.fuelTypes.includes(type)) {
    settings.fuelTypes.push(type);
    saveSettings();
    renderSettings();
    updateFormOptions();
    input.value = '';
    Swal.fire({
      icon: 'success',
      title: 'Tipo Agregado',
      text: `El tipo de combustible "${type}" ha sido agregado.`,
      timer: 1500
    });
  } else {
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: type ? 'El tipo ya existe.' : 'Por favor, ingrese un tipo válido.'
    });
  }
}

function removeFuelType(type) {
  Swal.fire({
    title: '¿Estás seguro?',
    text: `Se eliminará el tipo de combustible "${type}".`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Eliminar',
    cancelButtonText: 'Cancelar'
  }).then(result => {
    if (result.isConfirmed) {
      settings.fuelTypes = settings.fuelTypes.filter(t => t !== type);
      fuels.forEach(fuel => {
        if (fuel.type === type) fuel.type = settings.fuelTypes[0] || 'Sin tipo';
      });
      saveSettings();
      saveFuels();
      renderSettings();
      updateFormOptions();
      renderFuels();
      Swal.fire({
        icon: 'success',
        title: 'Tipo Eliminado',
        text: `El tipo de combustible "${type}" ha sido eliminado.`,
        timer: 1500
      });
    }
  });
}

// Renderizado de herramientas
function renderTools(page = 1, pageSize = 10) {
  const container = document.getElementById('toolContainer');
  container.innerHTML = tools.length === 0 ? '<p class="text-gray-500">No hay herramientas registradas.</p>' : '';

  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const paginatedTools = tools.slice(start, end);

  paginatedTools.forEach(tool => {
    const toolDiv = document.createElement('div');
    toolDiv.className = `tool bg-white p-4 rounded shadow ${isOverdue(tool) ? 'border-l-4 border-red-500' : ''}`;
    toolDiv.innerHTML = `
      <div class="flex items-center mb-2">
        <input type="checkbox" class="select-tool mr-2" data-id="${tool.id}">
        <h2 class="text-lg font-semibold ${tool.status === 'Prestado' ? 'text-yellow-600' : ''}">${tool.name}</h2>
        ${isOverdue(tool) ? '<span class="ml-2 text-red-600"><i class="fas fa-exclamation-triangle"></i> Vencido</span>' : ''}
      </div>
      <p>Cantidad: ${tool.quantity}</p>
      <p>Peso: ${tool.weight} kg</p>
      <p>Categoría: ${tool.category}</p>
      <p>Estado: ${tool.status}</p>
      <p>Ubicación: ${tool.location}</p>
      ${tool.photo ? `<img src="${tool.photo}" alt="${tool.name}" class="mt-2 max-w-full h-auto rounded">` : ''}
      <div class="mt-4 flex space-x-2">
        <button class="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600" onclick="loanTool(${tool.id})"><i class="fas fa-hand-holding mr-1"></i> Prestar</button>
        <button class="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600" onclick="returnTool(${tool.id})"><i class="fas fa-undo mr-1"></i> Devolver</button>
        <button class="bg-gray-500 text-white px-3 py-1 rounded hover:bg-gray-600" onclick="showToolDetails(${tool.id})"><i class="fas fa-info-circle mr-1"></i> Detalles</button>
      </div>
    `;
    container.appendChild(toolDiv);
  });

  renderPagination(tools.length, page, pageSize, 'toolContainer', renderTools);
}

// Renderizado de bencinas
function renderFuels(page = 1, pageSize = 10) {
  const container = document.getElementById('fuelContainer');
  container.innerHTML = fuels.length === 0 ? '<p class="text-gray-500">No hay bencinas registradas.</p>' : '';

  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const paginatedFuels = fuels.slice(start, end);

  paginatedFuels.forEach(fuel => {
    const fuelDiv = document.createElement('div');
    fuelDiv.className = 'fuel bg-white p-4 rounded shadow';
    fuelDiv.innerHTML = `
      <div class="flex items-center mb-2">
        <input type="checkbox" class="select-fuel mr-2" data-id="${fuel.id}">
        <h2 class="text-lg font-semibold">${fuel.name}</h2>
      </div>
      <p>Cantidad: ${fuel.quantity} litros</p>
      <p>Tipo: ${fuel.type}</p>
      <p>Monto: $${fuel.amount}</p>
      <p>Vehículo: ${fuel.vehicle || 'N/A'}</p>
      <p>Kilometraje: ${fuel.odometer || 'N/A'}</p>
      ${fuel.receipt ? `<img src="${fuel.receipt}" alt="Boleta de ${fuel.name}" class="mt-2 max-w-full h-auto rounded">` : ''}
      <div class="mt-4">
        <button class="bg-gray-500 text-white px-3 py-1 rounded hover:bg-gray-600" onclick="showFuelDetails(${fuel.id})"><i class="fas fa-info-circle mr-1"></i> Detalles</button>
      </div>
    `;
    container.appendChild(fuelDiv);
  });

  renderPagination(fuels.length, page, pageSize, 'fuelContainer', renderFuels);
}

// Paginación
function renderPagination(totalItems, currentPage, pageSize, containerId, renderFunction) {
  const totalPages = Math.ceil(totalItems / pageSize);
  const pagination = document.createElement('div');
  pagination.className = 'pagination flex justify-center mt-4 space-x-2';
  pagination.innerHTML = `
    <button class="px-3 py-1 bg-gray-200 rounded ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''}" 
            onclick="${currentPage > 1 ? `renderFunction(${currentPage - 1}, ${pageSize})` : ''}">Anterior</button>
    <span class="px-3 py-1 bg-gray-100 rounded">Página ${currentPage} de ${totalPages}</span>
    <button class="px-3 py-1 bg-gray-200 rounded ${currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : ''}" 
            onclick="${currentPage < totalPages ? `renderFunction(${currentPage + 1}, ${pageSize})` : ''}">Siguiente</button>
  `;
  const existingPagination = document.querySelector(`#${containerId} + .pagination`);
  if (existingPagination) existingPagination.remove();
  document.getElementById(containerId).after(pagination);
}

// Renderizado de historial de herramientas
function renderHistory() {
  const container = document.getElementById('historyContainer');
  container.innerHTML = history.length === 0 ? '<tr><td colspan="5" class="p-4 text-center text-gray-500">Sin historial registrado</td></tr>' : '';
  history.forEach(item => {
    const historyItem = document.createElement('tr');
    historyItem.className = 'border-b';
    historyItem.innerHTML = `
      <td class="p-2 border">${item.toolName}</td>
      <td class="p-2 border">${item.action}</td>
      <td class="p-2 border">${item.date} ${item.time}</td>
      <td class="p-2 border">${item.responsable}</td>
      <td class="p-2 border">${item.detail}</td>
    `;
    container.appendChild(historyItem);
  });

  // Re-inicializar DataTable
  if ($.fn.DataTable.isDataTable('#historyTable')) {
    $('#historyTable').DataTable().destroy();
  }
  $('#historyTable').DataTable({
    language: {
      url: '//cdn.datatables.net/plug-ins/1.11.5/i18n/es-ES.json'
    },
    responsive: true,
    searching: false,
    paging: false,
    info: false
  });
}

// Renderizado de historial de bencinas
function renderFuelHistory() {
  const container = document.getElementById('fuelHistoryContainer');
  container.innerHTML = fuelHistory.length === 0 ? '<tr><td colspan="5" class="p-4 text-center text-gray-500">Sin historial registrado</td></tr>' : '';
  fuelHistory.forEach(item => {
    const historyItem = document.createElement('tr');
    historyItem.className = 'border-b';
    historyItem.innerHTML = `
      <td class="p-2 border">${item.ResponsableCarga}</td>
      <td class="p-2 border">${item.date}</td>
      <td class="p-2 border">${item.quantity} litros</td>
      <td class="p-2 border">${item.type}</td>
      <td class="p-2 border">$${item.amount}</td>
    `;
    container.appendChild(historyItem);
  });

  // Re-inicializar DataTable
  if ($.fn.DataTable.isDataTable('#fuelHistoryTable')) {
    $('#fuelHistoryTable').DataTable().destroy();
  }
  $('#fuelHistoryTable').DataTable({
    language: {
      url: '//cdn.datatables.net/plug-ins/1.11.5/i18n/es-ES.json'
    },
    responsive: true,
    searching: false,
    paging: false,
    info: false
  });
}

// Agregar herramienta
function addTool() {
  const name = document.getElementById('toolName').value.trim();
  const quantity = document.getElementById('toolQuantity').value;
  const weight = document.getElementById('toolWeight').value;
  const category = document.getElementById('toolCategory').value;
  const status = document.getElementById('toolStatus').value;
  const location = document.getElementById('toolLocation').value;
  const details = document.getElementById('toolDetails').value.trim();
  const photoFile = document.getElementById('toolPhoto').files[0];

  const nameError = validateName(name, tools);
  const quantityError = validateQuantity(quantity, 1000, 'unidades');
  const weightError = validateWeight(weight);
  const categoryError = validateCategory(category);
  const statusError = validateStatus(status);
  const locationError = validateLocation(location);
  const photoError = validateImage(photoFile);

  if (nameError || quantityError || weightError || categoryError || statusError || locationError || photoError) {
    Swal.fire({
      icon: 'error',
      title: 'Error',
      html: [nameError, quantityError, weightError, categoryError, statusError, locationError, photoError].filter(e => e).join('<br>')
    });
    return;
  }

  const reader = new FileReader();
  const addToolFn = (photo = null) => {
    const newTool = {
      id: tools.length > 0 ? Math.max(...tools.map(t => t.id)) + 1 : 1,
      name,
      quantity: parseInt(quantity),
      weight: parseFloat(weight).toFixed(2),
      category,
      status,
      location,
      details,
      photo,
      registerDate: new Date().toLocaleDateString('es-ES'),
      loanedAt: null,
      lastUpdated: new Date().toISOString()
    };
    tools.push(newTool);
    saveTools();
    renderTools();
    clearToolForm();
    Swal.fire({
      icon: 'success',
      title: 'Éxito',
      text: 'Herramienta agregada correctamente.',
      timer: 1500
    });
  };

  if (photoFile) {
    reader.onload = event => addToolFn(event.target.result);
    reader.readAsDataURL(photoFile);
  } else {
    addToolFn();
  }
}

function clearToolForm() {
  document.getElementById('toolName').value = '';
  document.getElementById('toolQuantity').value = '';
  document.getElementById('toolWeight').value = '';
  document.getElementById('toolCategory').value = settings.toolCategories[0] || 'General';
  document.getElementById('toolStatus').value = 'Disponible';
  document.getElementById('toolLocation').value = settings.locations[0] || 'Bodega A';
  document.getElementById('toolDetails').value = '';
  document.getElementById('toolPhoto').value = '';
}

// Agregar bencina
function addFuel() {
  const name = document.getElementById('fuelName').value.trim();
  const quantity = document.getElementById('fuelQuantity').value;
  const type = document.getElementById('fuelType').value;
  const amount = document.getElementById('fuelAmount').value;
  const date = document.getElementById('fuelDate').value;
  const vehicle = document.getElementById('fuelVehicle').value.trim();
  const odometer = document.getElementById('fuelOdometer').value;
  const details = document.getElementById('fuelDetails').value.trim();
  const receiptFile = document.getElementById('fuelReceipt').files[0];

  const nameError = validateName(name, fuels);
  const quantityError = validateQuantity(quantity, 1000, 'litros');
  const typeError = !type ? 'El tipo de bencina es obligatorio.' : null;
  const amountError = validateAmount(amount);
  const dateError = validateDate(date);
  const odometerError = validateOdometer(odometer);
  const receiptError = validateImage(receiptFile);

  if (nameError || quantityError || typeError || amountError || dateError || odometerError || receiptError) {
    Swal.fire({
      icon: 'error',
      title: 'Error',
      html: [nameError, quantityError, typeError, amountError, dateError, odometerError, receiptError].filter(e => e).join('<br>')
    });
    return;
  }

  const reader = new FileReader();
  const addFuelFn = (receipt = null) => {
    const newFuel = {
      id: fuels.length > 0 ? Math.max(...fuels.map(f => f.id)) + 1 : 1,
      name,
      quantity: parseFloat(quantity).toFixed(2),
      type,
      amount: parseFloat(amount).toFixed(0),
      date: new Date(date).toLocaleDateString('es-ES'),
      vehicle: vehicle || null,
      odometer: odometer ? parseInt(odometer) : null,
      details: details || null,
      receipt,
      lastUpdated: new Date().toISOString()
    };
    fuels.push(newFuel);
    addFuelHistoryItem(newFuel);
    saveFuels();
    renderFuels();
    clearFuelForm();
    Swal.fire({
      icon: 'success',
      title: 'Éxito',
      text: 'Bencina agregada correctamente.',
      timer: 1500
    });
  };

  if (receiptFile) {
    reader.onload = event => addFuelFn(event.target.result);
    reader.readAsDataURL(receiptFile);
  } else {
    addFuelFn();
  }
}

function clearFuelForm() {
  document.getElementById('fuelName').value = '';
  document.getElementById('fuelQuantity').value = '';
  document.getElementById('fuelType').value = '';
  document.getElementById('fuelAmount').value = '';
  document.getElementById('fuelDate').value = '';
  document.getElementById('fuelVehicle').value = '';
  document.getElementById('fuelOdometer').value = '';
  document.getElementById('fuelDetails').value = '';
  document.getElementById('fuelReceipt').value = '';
}

function addFuelHistoryItem(fuel) {
  const historyItem = {
    id: fuel.id,
    ResponsableCarga: fuel.name,
    quantity: parseFloat(fuel.quantity),
    type: fuel.type,
    amount: parseFloat(fuel.amount),
    date: fuel.date,
    vehicle: fuel.vehicle || null,
    odometer: fuel.odometer || null,
    details: fuel.details || null,
    receipt: fuel.receipt || null
  };
  fuelHistory.push(historyItem);
  saveFuelHistory();
  renderFuelHistory();
}

// Gestión de préstamos
function loanTool(id) {
  const tool = tools.find(t => t.id === id);
  if (!tool) return;

  if (tool.quantity <= 0) {
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: 'No hay stock disponible para esta herramienta.'
    });
    return;
  }

  Swal.fire({
    title: 'Registrar Préstamo',
    html: `
      <div class="text-left">
        <p class="mb-2"><strong>Herramienta:</strong> ${tool.name}</p>
        <p class="mb-4"><strong>Disponibles:</strong> ${tool.quantity}</p>
        <input id="loanResponsible" class="swal2-input" placeholder="Nombre del responsable" required>
        <input id="loanDetail" class="swal2-input" placeholder="Detalle (opcional)">
        <select id="loanLocation" class="swal2-input">
          <option value="">Seleccione ubicación</option>
          ${settings.locations.map(loc => `<option value="${loc}">${loc}</option>`).join('')}
        </select>
        <input id="loanReturnDate" class="swal2-input" type="date" placeholder="Fecha de devolución esperada">
      </div>
    `,
    focusConfirm: false,
    preConfirm: () => {
      const responsible = document.getElementById('loanResponsible').value.trim();
      if (!responsible) {
        Swal.showValidationMessage('El nombre del responsable es obligatorio');
        return false;
      }
      return {
        responsible,
        detail: document.getElementById('loanDetail').value.trim(),
        location: document.getElementById('loanLocation').value,
        returnDate: document.getElementById('loanReturnDate').value
      };
    },
    showCancelButton: true,
    confirmButtonText: 'Prestar',
    cancelButtonText: 'Cancelar'
  }).then(result => {
    if (result.isConfirmed) {
      tool.quantity -= 1;
      tool.status = 'Prestado';
      tool.loanedAt = new Date();
      if (result.value.location) {
        tool.location = result.value.location;
      }
      tool.lastUpdated = new Date().toISOString();

      const action = 'Préstamo';
      const detail = result.value.detail || 'Herramienta prestada';
      const loanRecord = {
        toolId: tool.id,
        toolName: tool.name,
        action,
        date: new Date().toLocaleDateString('es-ES'),
        time: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
        detail,
        responsible: result.value.responsible,
        location: result.value.location || tool.location,
        status: 'Prestado',
        expectedReturn: result.value.returnDate || ''
      };

      history.push(loanRecord);
      saveTools();
      saveHistory();
      renderTools();
      renderHistory();

      Swal.fire({
        icon: 'success',
        title: 'Préstamo Registrado',
        html: `Herramienta <strong>${tool.name}</strong> prestada a <strong>${result.value.responsible}</strong>`,
        timer: 2000,
        timerProgressBar: true
      });
    }
  });
}

function returnTool(id) {
  const tool = tools.find(t => t.id === id);
  if (!tool) return;

  Swal.fire({
    title: 'Registrar Devolución',
    html: `
      <div class="text-left">
        <p class="mb-2"><strong>Herramienta:</strong> ${tool.name}</p>
        <input id="returnResponsible" class="swal2-input" placeholder="Nombre del responsable" required>
        <input id="returnDetail" class="swal2-input" placeholder="Detalle (opcional)">
        <select id="returnStatus" class="swal2-input">
          ${settings.toolStatuses.map(status => `<option value="${status}" ${status === 'Disponible' ? 'selected' : ''}>${status}</option>`).join('')}
        </select>
      </div>
    `,
    focusConfirm: false,
    preConfirm: () => {
      const responsible = document.getElementById('returnResponsible').value.trim();
      const status = document.getElementById('returnStatus').value;
      if (!responsible) {
        Swal.showValidationMessage('El nombre del responsable es obligatorio');
        return false;
      }
      if (!settings.toolStatuses.includes(status)) {
        Swal.showValidationMessage('El estado no es válido');
        return false;
      }
      return {
        responsible,
        detail: document.getElementById('returnDetail').value.trim(),
        status
      };
    },
    showCancelButton: true,
    confirmButtonText: 'Devolver',
    cancelButtonText: 'Cancelar'
  }).then(result => {
    if (result.isConfirmed) {
      tool.quantity += 1;
      tool.status = result.value.status;
      tool.loanedAt = null;
      tool.lastUpdated = new Date().toISOString();

      const action = 'Devolución';
      const detail = result.value.detail || 'Herramienta devuelta';
      const returnRecord = {
        toolId: tool.id,
        toolName: tool.name,
        action,
        date: new Date().toLocaleDateString('es-ES'),
        time: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
        detail,
        responsible: result.value.responsible,
        location: tool.location,
        status: result.value.status,
        expectedReturn: ''
      };

      history.push(returnRecord);
      saveTools();
      saveHistory();
      renderTools();
      renderHistory();

      Swal.fire({
        icon: 'success',
        title: 'Devolución Registrada',
        html: `Herramienta <strong>${tool.name}</strong> devuelta por <strong>${result.value.responsible}</strong>`,
        timer: 2000,
        timerProgressBar: true
      });
    }
  });
}

function isOverdue(tool) {
  if (!tool.loanedAt || tool.status !== 'Prestado') return false;
  const loanedAt = new Date(tool.loanedAt);
  const now = new Date();
  const diff = now - loanedAt;
  const hours = diff / (1000 * 60 * 60);
  return hours > 8;
}

// Importación de datos
function importTools() {
  const fileInput = document.getElementById('excelFile');
  const file = fileInput.files[0];
  if (!file) {
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: 'Por favor, seleccione un archivo Excel.'
    });
    return;
  }

  const reader = new FileReader();
  reader.onload = function(event) {
    try {
      const data = event.target.result;
      const workbook = XLSX.read(data, { type: 'binary', cellDates: true });
      let importedTools = 0;
      let importedFuels = 0;
      let skippedRows = 0;
      let importErrors = [];

      // Importar herramientas
      if (workbook.SheetNames.includes('Herramientas')) {
        const sheet = workbook.Sheets['Herramientas'];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: null, raw: false });
        
        jsonData.forEach((row, index) => {
          try {
            // Validar fila vacía
            if (!row['Nombre'] && !row['Cantidad'] && !row['Peso (kg)']) {
              skippedRows++;
              return;
            }

            const name = row['Nombre'] ? String(row['Nombre']).trim() : null;
            const quantity = row['Cantidad'] ? parseInt(row['Cantidad']) : 0;
            const weight = row['Peso (kg)'] ? parseFloat(row['Peso (kg)']) : 0;
            const category = row['Categoría'] ? String(row['Categoría']).trim() : 'General';
            const status = row['Estado'] ? String(row['Estado']).trim() : 'Disponible';
            const location = row['Ubicación'] ? String(row['Ubicación']).trim() : settings.locations[0] || 'Bodega A';
            const details = row['Detalles'] ? String(row['Detalles']).trim() : '';
            const registerDate = row['Fecha Registro'] ? 
              (row['Fecha Registro'] instanceof Date ? 
                row['Fecha Registro'].toLocaleDateString('es-ES') : 
                String(row['Fecha Registro'])) : 
              new Date().toLocaleDateString('es-ES');

            // Validaciones
            const nameError = validateName(name, tools);
            if (nameError) throw new Error(`Fila ${index + 2}: ${nameError}`);
            if (isNaN(quantity) || quantity < 0) throw new Error(`Fila ${index + 2}: Cantidad inválida`);
            if (isNaN(weight) || weight < 0) throw new Error(`Fila ${index + 2}: Peso inválido`);
            if (!settings.toolCategories.includes(category)) settings.toolCategories.push(category);
            if (!settings.toolStatuses.includes(status)) throw new Error(`Fila ${index + 2}: Estado inválido`);
            if (!settings.locations.includes(location)) settings.locations.push(location);

            tools.push({
              id: tools.length > 0 ? Math.max(...tools.map(t => t.id)) + 1 : 1,
              name,
              quantity,
              weight: parseFloat(weight).toFixed(2),
              category,
              status,
              location,
              details,
              registerDate,
              photo: row['Foto'] || null,
              loanedAt: null,
              lastUpdated: new Date().toISOString()
            });
            importedTools++;
          } catch (error) {
            skippedRows++;
            importErrors.push(error.message);
          }
        });
      }

      // Importar bencinas
      if (workbook.SheetNames.includes('Bencinas')) {
        const sheet = workbook.Sheets['Bencinas'];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: null, raw: false });
        
        jsonData.forEach((row, index) => {
          try {
            // Validar fila vacía
            if (!row['Responsable'] && !row['Cantidad (litros)'] && !row['Tipo']) {
              skippedRows++;
              return;
            }

            const name = row['Responsable'] ? String(row['Responsable']).trim() : 'Sin responsable';
            const quantity = row['Cantidad (litros)'] ? parseFloat(row['Cantidad (litros)']) : 0;
            const type = row['Tipo'] ? String(row['Tipo']).trim() : settings.fuelTypes[0] || 'Sin tipo';
            const amount = row['Monto'] ? parseFloat(row['Monto']) : 0;
            const date = row['Fecha'] ? 
              (row['Fecha'] instanceof Date ? 
                row['Fecha'].toLocaleDateString('es-ES') : 
                String(row['Fecha'])) : 
              new Date().toLocaleDateString('es-ES');
            const details = row['Detalles'] ? String(row['Detalles']).trim() : '';
            const vehicle = row['Vehículo'] ? String(row['Vehículo']).trim() : '';
            const odometer = row['Kilometraje'] ? parseInt(row['Kilometraje']) : null;

            // Validaciones
            const nameError = validateName(name, fuels);
            if (nameError && name !== 'Sin responsable') throw new Error(`Fila ${index + 2}: ${nameError}`);
            if (isNaN(quantity) || quantity < 0) throw new Error(`Fila ${index + 2}: Cantidad inválida`);
            if (!settings.fuelTypes.includes(type)) settings.fuelTypes.push(type);
            if (isNaN(amount) || amount < 0) throw new Error(`Fila ${index + 2}: Monto inválido`);
            if (odometer && (isNaN(odometer) || odometer < 0)) throw new Error(`Fila ${index + 2}: Kilometraje inválido`);

            const newFuel = {
              id: fuels.length > 0 ? Math.max(...fuels.map(f => f.id)) + 1 : 1,
              name,
              quantity: parseFloat(quantity).toFixed(2),
              type,
              amount: parseFloat(amount).toFixed(0),
              date,
              details,
              vehicle,
              odometer,
              receipt: row['Boleta'] || null,
              lastUpdated: new Date().toISOString()
            };
            fuels.push(newFuel);
            addFuelHistoryItem(newFuel);
            importedFuels++;
          } catch (error) {
            skippedRows++;
            importErrors.push(error.message);
          }
        });
      }

      saveSettings();
      saveTools();
      saveFuels();
      renderTools();
      renderFuels();
      renderFuelHistory();
      updateFormOptions();

      let message = `Importadas ${importedTools} herramientas y ${importedFuels} bencinas.`;
      if (skippedRows > 0) {
        message += ` Omitidas ${skippedRows} filas con datos inválidos.`;
      }
      if (importErrors.length > 0) {
        message += `<br><br>Errores:<br>${importErrors.slice(0, 5).join('<br>')}`;
        if (importErrors.length > 5) {
          message += `<br>...y ${importErrors.length - 5} más`;
        }
      }

      Swal.fire({
        icon: importedTools + importedFuels > 0 ? 'success' : 'warning',
        title: 'Resultado de Importación',
        html: message,
        scrollbarPadding: false
      });
      fileInput.value = '';
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Error al importar el archivo: ' + error.message
      });
    }
  };
  reader.readAsBinaryString(file);
}

// Exportación de datos
function exportTools() {
  try {
    const wb = XLSX.utils.book_new();
    
    // Hoja de herramientas
    const toolSheetData = tools.map(tool => ({
      'ID': tool.id,
      'Nombre': tool.name,
      'Cantidad': parseInt(tool.quantity),
      'Peso (kg)': parseFloat(tool.weight),
      'Categoría': tool.category,
      'Estado': tool.status,
      'Ubicación': tool.location,
      'Detalles': tool.details,
      'Fecha Registro': tool.registerDate,
      'Última Actualización': new Date(tool.lastUpdated).toLocaleString('es-ES'),
      'Foto': tool.photo || ''
    }));
    
    // Hoja de bencinas
    const fuelSheetData = fuels.map(fuel => ({
      'ID': fuel.id,
      'Responsable': fuel.name,
      'Cantidad (litros)': parseFloat(fuel.quantity),
      'Tipo': fuel.type,
      'Monto': parseFloat(fuel.amount),
      'Fecha': fuel.date,
      'Vehículo': fuel.vehicle,
      'Kilometraje': fuel.odometer,
      'Detalles': fuel.details,
      'Boleta': fuel.receipt || '',
      'Última Actualización': new Date(fuel.lastUpdated).toLocaleString('es-ES')
    }));
    
    // Hoja de historial de herramientas
    const historySheetData = history.map(item => ({
      'ID Herramienta': item.toolId,
      'Herramienta': item.toolName,
      'Acción': item.action,
      'Fecha': item.date,
      'Hora': item.time,
      'Responsable': item.responsible,
      'Detalle': item.detail,
      'Ubicación': item.location || '',
      'Estado': item.status || ''
    }));
    
    // Hoja de historial de bencinas
    const fuelHistorySheetData = fuelHistory.map(item => ({
      'ID Carga': item.id,
      'Responsable': item.ResponsableCarga,
      'Cantidad (litros)': item.quantity,
      'Tipo': item.type,
      'Monto': item.amount,
      'Fecha': item.date,
      'Vehículo': item.vehicle || '',
      'Kilometraje': item.odometer || '',
      'Boleta': item.receipt || '',
      'Detalles': item.details || ''
    }));

    // Crear hojas
    const toolSheet = XLSX.utils.json_to_sheet(toolSheetData);
    const fuelSheet = XLSX.utils.json_to_sheet(fuelSheetData);
    const historySheet = XLSX.utils.json_to_sheet(historySheetData);
    const fuelHistorySheet = XLSX.utils.json_to_sheet(fuelHistorySheetData);

    // Añadir hojas al libro
    XLSX.utils.book_append_sheet(wb, toolSheet, 'Herramientas');
    XLSX.utils.book_append_sheet(wb, fuelSheet, 'Bencinas');
    XLSX.utils.book_append_sheet(wb, historySheet, 'Historial Herramientas');
    XLSX.utils.book_append_sheet(wb, fuelHistorySheet, 'Historial Bencinas');

    // Generar nombre de archivo con fecha
    const now = new Date();
    const timestamp = `${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}_${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}`;
    const fileName = `CrisoullManager_Export_${timestamp}.xlsx`;

    XLSX.writeFile(wb, fileName);
    
    Swal.fire({
      icon: 'success',
      title: 'Exportación Exitosa',
      html: `Se exportaron:<br>
             - ${tools.length} herramientas<br>
             - ${fuels.length} cargas de bencina<br>
             - ${history.length} movimientos de herramientas<br>
             - ${fuelHistory.length} registros de combustible`,
      confirmButtonText: 'Aceptar'
    });
  } catch (error) {
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: 'Error al exportar datos: ' + error.message
    });
  }
}

// Respaldo de base de datos
function backupDatabase() {
  try {
    const wb = XLSX.utils.book_new();
    const toolSheetData = tools.map(tool => ({
      'ID': tool.id,
      'Nombre': tool.name,
      'Cantidad': parseInt(tool.quantity),
      'Peso (kg)': parseFloat(tool.weight),
      'Categoría': tool.category,
      'Estado': tool.status,
      'Ubicación': tool.location,
      'Detalles': tool.details,
      'Fecha Registro': tool.registerDate,
      'Última Actualización': new Date(tool.lastUpdated).toLocaleString('es-ES'),
      'Foto': tool.photo || ''
    }));
    const fuelSheetData = fuels.map(fuel => ({
      'ID': fuel.id,
      'Responsable': fuel.name,
      'Cantidad (litros)': parseFloat(fuel.quantity),
      'Tipo': fuel.type,
      'Monto': parseFloat(fuel.amount),
      'Fecha': fuel.date,
      'Vehículo': fuel.vehicle,
      'Kilometraje': fuel.odometer,
      'Detalles': fuel.details,
      'Boleta': fuel.receipt || '',
      'Última Actualización': new Date(fuel.lastUpdated).toLocaleString('es-ES')
    }));
    const historySheetData = history.map(item => ({
      'ID Herramienta': item.toolId,
      'Herramienta': item.toolName,
      'Acción': item.action,
      'Fecha': item.date,
      'Hora': item.time,
      'Responsable': item.responsible,
      'Detalle': item.detail,
      'Ubicación': item.location || '',
      'Estado': item.status || ''
    }));
    const fuelHistorySheetData = fuelHistory.map(item => ({
      'ID Carga': item.id,
      'Responsable': item.ResponsableCarga,
      'Cantidad (litros)': item.quantity,
      'Tipo': item.type,
      'Monto': item.amount,
      'Fecha': item.date,
      'Vehículo': item.vehicle || '',
      'Kilometraje': item.odometer || '',
      'Boleta': item.receipt || '',
      'Detalles': item.details || ''
    }));

    const toolSheet = XLSX.utils.json_to_sheet(toolSheetData);
    const fuelSheet = XLSX.utils.json_to_sheet(fuelSheetData);
    const historySheet = XLSX.utils.json_to_sheet(historySheetData);
    const fuelHistorySheet = XLSX.utils.json_to_sheet(fuelHistorySheetData);

    XLSX.utils.book_append_sheet(wb, toolSheet, 'Herramientas');
    XLSX.utils.book_append_sheet(wb, fuelSheet, 'Bencinas');
    XLSX.utils.book_append_sheet(wb, historySheet, 'Historial Herramientas');
    XLSX.utils.book_append_sheet(wb, fuelHistorySheet, 'Historial Bencinas');

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    XLSX.writeFile(wb, `CrisoullManager_Backup_${timestamp}.xlsx`);
    Swal.fire({
      icon: 'success',
      title: 'Éxito',
      text: 'Respaldo de la base de datos creado exitosamente.'
    });
  } catch (error) {
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: 'Error al crear respaldo: ' + error.message
    });
  }
}

// Detalles de herramienta
function showToolDetails(id) {
  currentTool = tools.find(t => t.id === id);
  if (!currentTool) return;

  document.getElementById('modalToolId').textContent = currentTool.id;
  document.getElementById('modalToolName').textContent = currentTool.name;

  const photo = document.getElementById('modalToolPhoto');
  if (currentTool.photo) {
    photo.src = currentTool.photo;
    photo.classList.remove('hidden');
  } else {
    photo.classList.add('hidden');
  }

  document.getElementById('modalToolQuantity').textContent = currentTool.quantity;
  document.getElementById('modalToolWeight').textContent = parseFloat(currentTool.weight).toFixed(2);
  document.getElementById('modalToolStatus').textContent = currentTool.status;
  document.getElementById('modalToolLocation').textContent = currentTool.location;
  document.getElementById('modalToolRegisterDate').textContent = currentTool.registerDate;

  const modalToolHistory = document.getElementById('modalToolHistory');
  modalToolHistory.innerHTML = '';

  const toolHistory = history.filter(item => item.toolId === currentTool.id);
  if (toolHistory.length === 0) {
    modalToolHistory.innerHTML = '<tr><td colspan="4" class="p-4 text-center text-gray-500">Sin historial registrado</td></tr>';
  } else {
    toolHistory.forEach(item => {
      const historyItem = document.createElement('tr');
      historyItem.className = 'border-b';
      historyItem.innerHTML = `
        <td class="p-2 border">${item.date} ${item.time}</td>
        <td class="p-2 border">${item.action}</td>
        <td class="p-2 border">${item.responsible}</td>
        <td class="p-2 border">${item.detail}</td>
      `;
      modalToolHistory.appendChild(historyItem);
    });
  }

  document.getElementById('toolModal').classList.remove('hidden');
}

// Detalles de bencina
function showFuelDetails(id) {
  currentFuel = fuels.find(f => f.id === id);
  if (!currentFuel) return;

  document.getElementById('modalFuelName').textContent = currentFuel.name;
  const receipt = document.getElementById('modalFuelReceipt');
  if (currentFuel.receipt) {
    receipt.src = currentFuel.receipt;
    receipt.classList.remove('hidden');
  } else {
    receipt.classList.add('hidden');
  }
  document.getElementById('modalFuelQuantity').textContent = parseFloat(currentFuel.quantity).toFixed(2);
  document.getElementById('modalFuelType').textContent = currentFuel.type;
  document.getElementById('modalFuelAmount').textContent = parseFloat(currentFuel.amount).toFixed(0);
  document.getElementById('modalFuelDate').textContent = currentFuel.date;
  document.getElementById('modalFuelVehicle').textContent = currentFuel.vehicle || 'N/A';
  document.getElementById('modalFuelOdometer').textContent = currentFuel.odometer || 'N/A';
  document.getElementById('modalFuelDetails').textContent = currentFuel.details || 'N/A';

  document.getElementById('fuelModal').classList.remove('hidden');
}

// Imprimir reporte
function printToolReport() {
  if (!currentTool) return;

  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Reporte de Herramienta - ${currentTool.name}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1 { color: #333; border-bottom: 2px solid #333; padding-bottom: 10px; }
        .header { display: flex; justify-content: space-between; margin-bottom: 20px; }
        .details { margin-bottom: 20px; }
        .detail-row { display: flex; margin-bottom: 5px; }
        .detail-label { font-weight: bold; min-width: 150px; }
        .history-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        .history-table th, .history-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        .history-table th { background-color: #f2f2f2; }
        .footer { margin-top: 30px; font-size: 0.8em; text-align: right; color: #666; }
        .tool-image { max-width: 200px; max-height: 150px; margin: 10px 0; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Reporte de Herramienta</h1>
        <div>Fecha: ${new Date().toLocaleDateString('es-ES')}</div>
      </div>
      
      <div class="details">
        <div class="detail-row">
          <div class="detail-label">ID:</div>
          <div>${currentTool.id}</div>
        </div>
        <div class="detail-row">
          <div class="detail-label">Nombre:</div>
          <div>${currentTool.name}</div>
        </div>
        <div class="detail-row">
          <div class="detail-label">Cantidad:</div>
          <div>${currentTool.quantity}</div>
        </div>
        <div class="detail-row">
          <div class="detail-label">Peso:</div>
          <div>${currentTool.weight} kg</div>
        </div>
        <div class="detail-row">
          <div class="detail-label">Categoría:</div>
          <div>${currentTool.category}</div>
        </div>
        <div class="detail-row">
          <div class="detail-label">Estado:</div>
          <div>${currentTool.status}</div>
        </div>
        <div class="detail-row">
          <div class="detail-label">Ubicación:</div>
          <div>${currentTool.location}</div>
        </div>
        <div class="detail-row">
          <div class="detail-label">Fecha Registro:</div>
          <div>${currentTool.registerDate}</div>
        </div>
        ${currentTool.photo ? `<img src="${currentTool.photo}" alt="${currentTool.name}" class="tool-image">` : ''}
      </div>
      
      <h2>Historial de Movimientos</h2>
      <table class="history-table">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Acción</th>
            <th>Responsable</th>
            <th>Detalle</th>
          </tr>
        </thead>
        <tbody>
          ${history.filter(item => item.toolId === currentTool.id).map(item => `
            <tr>
              <td>${item.date} ${item.time}</td>
              <td>${item.action}</td>
              <td>${item.responsible}</td>
              <td>${item.detail}</td>
            </tr>
          `).join('') || '<tr><td colspan="4" class="text-center">Sin historial registrado</td></tr>'}
        </tbody>
      </table>
      
      <div class="footer">
        Generado por Crisoull Manager
      </div>
    </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.print();
}

// Filtros para herramientas
function applyFilters() {
  const search = document.getElementById('searchInput').value.toLowerCase();
  const date = document.getElementById('dateFilter').value;
  const action = document.getElementById('actionFilter').value;
  const cost = document.getElementById('costFilter').value;

  let filteredTools = [...tools];

  if (search) {
    filteredTools = filteredTools.filter(tool =>
      tool.name.toLowerCase().includes(search) ||
      tool.details.toLowerCase().includes(search) ||
      history.some(h => h.toolId === tool.id && h.responsible.toLowerCase().includes(search))
    );
  }

  if (date) {
    filteredTools = filteredTools.filter(tool =>
      history.some(h => h.toolId === tool.id && h.date === new Date(date).toLocaleDateString('es-ES'))
    );
  }

  if (action) {
    filteredTools = filteredTools.filter(tool =>
      history.some(h => h.toolId === tool.id && h.action === action)
    );
  }

  if (cost) {
    filteredTools = filteredTools.filter(tool =>
      cost === 'low' ? parseFloat(tool.weight) < 5 : parseFloat(tool.weight) >= 5
    );
  }

  tools = filteredTools;
  renderTools();
  tools = JSON.parse(localStorage.getItem('tools')) || [];
}

// Filtros para bencinas
function applyFuelFilters() {
  const search = document.getElementById('fuelSearchInput').value.toLowerCase();
  const type = document.getElementById('fuelTypeFilter').value;
  const amount = document.getElementById('fuelAmountFilter').value;

  let filteredFuels = [...fuels];

  if (search) {
    filteredFuels = filteredFuels.filter(fuel =>
      fuel.name.toLowerCase().includes(search) ||
      fuel.type.toLowerCase().includes(search)
    );
  }

  if (type) {
    filteredFuels = filteredFuels.filter(fuel => fuel.type === type);
  }

  if (amount) {
    filteredFuels = filteredFuels.filter(fuel => parseFloat(fuel.amount) >= parseFloat(amount));
  }

  fuels = filteredFuels;
  renderFuels();
  fuels = JSON.parse(localStorage.getItem('fuels')) || [];
}

// Eliminación de herramientas seleccionadas
function deleteSelectedTools() {
  const selected = Array.from(document.querySelectorAll('.select-tool:checked')).map(cb => parseInt(cb.dataset.id));
  if (selected.length === 0) {
    Swal.fire({
      icon: 'warning',
      title: 'Advertencia',
      text: 'No se han seleccionado herramientas.'
    });
    return;
  }

  Swal.fire({
    title: '¿Estás seguro?',
    text: `Se eliminarán ${selected.length} herramientas.`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Eliminar',
    cancelButtonText: 'Cancelar'
  }).then(result => {
    if (result.isConfirmed) {
      tools = tools.filter(tool => !selected.includes(tool.id));
      history = history.filter(item => !selected.includes(item.toolId));
      saveTools();
      saveHistory();
      renderTools();
      renderHistory();
      Swal.fire({
        icon: 'success',
        title: 'Eliminadas',
        text: `${selected.length} herramientas eliminadas.`,
        timer: 1500
      });
    }
  });
}

// Eliminación de bencinas seleccionadas
function deleteSelectedFuels() {
  const selected = Array.from(document.querySelectorAll('.select-fuel:checked')).map(cb => parseInt(cb.dataset.id));
  if (selected.length === 0) {
    Swal.fire({
      icon: 'warning',
      title: 'Advertencia',
      text: 'No se han seleccionado bencinas.'
    });
    return;
  }

  Swal.fire({
    title: '¿Estás seguro?',
    text: `Se eliminarán ${selected.length} registros de bencina.`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Eliminar',
    cancelButtonText: 'Cancelar'
  }).then(result => {
    if (result.isConfirmed) {
      fuels = fuels.filter(fuel => !selected.includes(fuel.id));
      fuelHistory = fuelHistory.filter(item => !selected.includes(item.id));
      saveFuels();
      saveFuelHistory();
      renderFuels();
      renderFuelHistory();
      Swal.fire({
        icon: 'success',
        title: 'Eliminadas',
        text: `${selected.length} bencinas eliminadas.`,
        timer: 1500
      });
    }
  });
}

// Seleccionar todas las herramientas
function selectAllTools() {
  const checkboxes = document.querySelectorAll('.select-tool');
  const allChecked = Array.from(checkboxes).every(cb => cb.checked);
  checkboxes.forEach(cb => cb.checked = !allChecked);
}

// Seleccionar todas las bencinas
function selectAllFuels() {
  const checkboxes = document.querySelectorAll('.select-fuel');
  const allChecked = Array.from(checkboxes).every(cb => cb.checked);
  checkboxes.forEach(cb => cb.checked = !allChecked);
}

// Editar herramientas seleccionadas
function editSelectedTools() {
  const selected = Array.from(document.querySelectorAll('.select-tool:checked')).map(cb => parseInt(cb.dataset.id));
  if (selected.length === 0) {
    Swal.fire({
      icon: 'warning',
      title: 'Advertencia',
      text: 'No se han seleccionado herramientas.'
    });
    return;
  }
  if (selected.length > 1) {
    Swal.fire({
      icon: 'warning',
      title: 'Advertencia',
      text: 'Por favor, seleccione solo una herramienta para editar.'
    });
    return;
  }

  const tool = tools.find(t => t.id === selected[0]);
  if (!tool) return;

  Swal.fire({
    title: 'Editar Herramienta',
    html: `
      <div class="text-left">
        <label class="block mb-2">Nombre:</label>
        <input id="editToolName" class="swal2-input" value="${tool.name}" required>
        <label class="block mb-2 mt-2">Cantidad:</label>
        <input id="editToolQuantity" class="swal2-input" type="number" value="${tool.quantity}" min="0" max="1000">
        <label class="block mb-2 mt-2">Peso (kg):</label>
        <input id="editToolWeight" class="swal2-input" type="number" value="${tool.weight}" min="0" max="100" step="0.01">
        <label class="block mb-2 mt-2">Categoría:</label>
        <select id="editToolCategory" class="swal2-input">
          ${settings.toolCategories.map(cat => `<option value="${cat}" ${cat === tool.category ? 'selected' : ''}>${cat}</option>`).join('')}
        </select>
        <label class="block mb-2 mt-2">Estado:</label>
        <select id="editToolStatus" class="swal2-input">
          ${settings.toolStatuses.map(status => `<option value="${status}" ${status === tool.status ? 'selected' : ''}>${status}</option>`).join('')}
        </select>
        <label class="block mb-2 mt-2">Ubicación:</label>
        <select id="editToolLocation" class="swal2-input">
          ${settings.locations.map(loc => `<option value="${loc}" ${loc === tool.location ? 'selected' : ''}>${loc}</option>`).join('')}
        </select>
        <label class="block mb-2 mt-2">Detalles:</label>
        <input id="editToolDetails" class="swal2-input" value="${tool.details || ''}">
        <label class="block mb-2 mt-2">Foto:</label>
        <input id="editToolPhoto" class="swal2-input" type="file" accept="image/jpeg,image/png">
      </div>
    `,
    focusConfirm: false,
    preConfirm: () => {
      const name = document.getElementById('editToolName').value.trim();
      const quantity = document.getElementById('editToolQuantity').value;
      const weight = document.getElementById('editToolWeight').value;
      const category = document.getElementById('editToolCategory').value;
      const status = document.getElementById('editToolStatus').value;
      const location = document.getElementById('editToolLocation').value;
      const details = document.getElementById('editToolDetails').value.trim();
      const photoFile = document.getElementById('editToolPhoto').files[0];

      const nameError = validateName(name, tools, tool.id);
      const quantityError = validateQuantity(quantity, 1000, 'unidades');
      const weightError = validateWeight(weight);
      const categoryError = validateCategory(category);
      const statusError = validateStatus(status);
      const locationError = validateLocation(location);
      const photoError = validateImage(photoFile);

      if (nameError || quantityError || weightError || categoryError || statusError || locationError || photoError) {
        Swal.showValidationMessage([nameError, quantityError, weightError, categoryError, statusError, locationError, photoError].filter(e => e).join('<br>'));
        return false;
      }

      return { name, quantity, weight, category, status, location, details, photoFile };
    },
    showCancelButton: true,
    confirmButtonText: 'Guardar',
    cancelButtonText: 'Cancelar'
  }).then(result => {
    if (result.isConfirmed) {
      const { name, quantity, weight, category, status, location, details, photoFile } = result.value;
      const reader = new FileReader();
      const updateTool = (photo = tool.photo) => {
        tool.name = name;
        tool.quantity = parseInt(quantity);
        tool.weight = parseFloat(weight).toFixed(2);
        tool.category = category;
        tool.status = status;
        tool.location = location;
        tool.details = details;
        tool.photo = photo;
        tool.lastUpdated = new Date().toISOString();

        saveTools();
        renderTools();
        Swal.fire({
          icon: 'success',
          title: 'Éxito',
          text: 'Herramienta actualizada correctamente.',
          timer: 1500
        });
      };

      if (photoFile) {
        reader.onload = event => updateTool(event.target.result);
        reader.readAsDataURL(photoFile);
      } else {
        updateTool();
      }
    }
  });
}

// Editar bencinas seleccionadas
function editSelectedFuels() {
  const selected = Array.from(document.querySelectorAll('.select-fuel:checked')).map(cb => parseInt(cb.dataset.id));
  if (selected.length === 0) {
    Swal.fire({
      icon: 'warning',
      title: 'Advertencia',
      text: 'No se han seleccionado bencinas.'
    });
    return;
  }
  if (selected.length > 1) {
    Swal.fire({
      icon: 'warning',
      title: 'Advertencia',
      text: 'Por favor, seleccione solo un registro de bencina para editar.'
    });
    return;
  }

  const fuel = fuels.find(f => f.id === selected[0]);
  if (!fuel) return;

  Swal.fire({
    title: 'Editar Bencina',
    html: `
      <div class="text-left">
        <label class="block mb-2">Responsable:</label>
        <input id="editFuelName" class="swal2-input" value="${fuel.name}" required>
        <label class="block mb-2 mt-2">Cantidad (litros):</label>
        <input id="editFuelQuantity" class="swal2-input" type="number" value="${fuel.quantity}" min="0" max="1000" step="0.01">
        <label class="block mb-2 mt-2">Tipo:</label>
        <select id="editFuelType" class="swal2-input">
          ${settings.fuelTypes.map(type => `<option value="${type}" ${type === fuel.type ? 'selected' : ''}>${type}</option>`).join('')}
        </select>
        <label class="block mb-2 mt-2">Monto:</label>
        <input id="editFuelAmount" class="swal2-input" type="number" value="${fuel.amount}" min="0" max="1000000">
        <label class="block mb-2 mt-2">Fecha:</label>
        <input id="editFuelDate" class="swal2-input" type="date" value="${fuel.date.split('/').reverse().join('-')}">
        <label class="block mb-2 mt-2">Vehículo:</label>
        <input id="editFuelVehicle" class="swal2-input" value="${fuel.vehicle || ''}">
        <label class="block mb-2 mt-2">Kilometraje:</label>
        <input id="editFuelOdometer" class="swal2-input" type="number" value="${fuel.odometer || ''}">
        <label class="block mb-2 mt-2">Detalles:</label>
        <input id="editFuelDetails" class="swal2-input" value="${fuel.details || ''}">
        <label class="block mb-2 mt-2">Boleta:</label>
        <input id="editFuelReceipt" class="swal2-input" type="file" accept="image/jpeg,image/png">
      </div>
    `,
    focusConfirm: false,
    preConfirm: () => {
      const name = document.getElementById('editFuelName').value.trim();
      const quantity = document.getElementById('editFuelQuantity').value;
      const type = document.getElementById('editFuelType').value;
      const amount = document.getElementById('editFuelAmount').value;
      const date = document.getElementById('editFuelDate').value;
      const vehicle = document.getElementById('editFuelVehicle').value.trim();
      const odometer = document.getElementById('editFuelOdometer').value;
      const details = document.getElementById('editFuelDetails').value.trim();
      const receiptFile = document.getElementById('editFuelReceipt').files[0];

      const nameError = validateName(name, fuels, fuel.id);
      const quantityError = validateQuantity(quantity, 1000, 'litros');
      const typeError = !type ? 'El tipo de bencina es obligatorio.' : null;
      const amountError = validateAmount(amount);
      const dateError = validateDate(date);
      const odometerError = validateOdometer(odometer);
      const receiptError = validateImage(receiptFile);

      if (nameError || quantityError || typeError || amountError || dateError || odometerError || receiptError) {
        Swal.showValidationMessage([nameError, quantityError, typeError, amountError, dateError, odometerError, receiptError].filter(e => e).join('<br>'));
        return false;
      }

      return { name, quantity, type, amount, date, vehicle, odometer, details, receiptFile };
    },
    showCancelButton: true,
    confirmButtonText: 'Guardar',
    cancelButtonText: 'Cancelar'
  }).then(result => {
    if (result.isConfirmed) {
      const { name, quantity, type, amount, date, vehicle, odometer, details, receiptFile } = result.value;
      const reader = new FileReader();
      const updateFuel = (receipt = fuel.receipt) => {
        fuel.name = name;
        fuel.quantity = parseFloat(quantity).toFixed(2);
        fuel.type = type;
        fuel.amount = parseFloat(amount).toFixed(0);
        fuel.date = new Date(date).toLocaleDateString('es-ES');
        fuel.vehicle = vehicle || null;
        fuel.odometer = odometer ? parseInt(odometer) : null;
        fuel.details = details || null;
        fuel.receipt = receipt;
        fuel.lastUpdated = new Date().toISOString();

        // Actualizar historial
        const historyItem = fuelHistory.find(h => h.id === fuel.id);
        if (historyItem) {
          historyItem.ResponsableCarga = name;
          historyItem.quantity = parseFloat(quantity);
          historyItem.type = type;
          historyItem.amount = parseFloat(amount);
          historyItem.date = fuel.date;
          historyItem.vehicle = vehicle || null;
          historyItem.odometer = odometer || null;
          historyItem.details = details || null;
          historyItem.receipt = receipt;
        } else {
          addFuelHistoryItem(fuel);
        }

        saveFuels();
        saveFuelHistory();
        renderFuels();
        renderFuelHistory();
        Swal.fire({
          icon: 'success',
          title: 'Éxito',
          text: 'Bencina actualizada correctamente.',
          timer: 1500
        });
      };

      if (receiptFile) {
        reader.onload = event => updateFuel(event.target.result);
        reader.readAsDataURL(receiptFile);
      } else {
        updateFuel();
      }
    }
  });
}

// Navegación
function showSection(section) {
  document.querySelectorAll('.container').forEach(container => {
    container.classList.add('hidden');
  });
  document.getElementById(`${section}Section`).classList.remove('hidden');
  toggleSidebar();
}

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  sidebar.classList.toggle('-translate-x-full');
}

function goBack() {
  window.location.href = 'index.html';
}

// Manejo de modales
document.querySelectorAll('.modal .close').forEach(closeBtn => {
  closeBtn.addEventListener('click', () => {
    document.querySelectorAll('.modal').forEach(modal => modal.classList.add('hidden'));
    currentTool = null;
    currentFuel = null;
  });
});

// Guardar datos
function saveTools() {
  localStorage.setItem('tools', JSON.stringify(tools));
}

function saveFuels() {
  localStorage.setItem('fuels', JSON.stringify(fuels));
}

function saveHistory() {
  localStorage.setItem('history', JSON.stringify(history));
}

function saveFuelHistory() {
  localStorage.setItem('fuelHistory', JSON.stringify(fuelHistory));
}

function saveSettings() {
  localStorage.setItem('settings', JSON.stringify(settings));
}

// Cargar datos
function loadData() {
  tools = JSON.parse(localStorage.getItem('tools')) || [];
  fuels = JSON.parse(localStorage.getItem('fuels')) || [];
  history = JSON.parse(localStorage.getItem('history')) || [];
  fuelHistory = JSON.parse(localStorage.getItem('fuelHistory')) || [];
  initSettings();
  renderTools();
  renderFuels();
  renderHistory();
  renderFuelHistory();
}
// Inicialización
document.addEventListener('DOMContentLoaded', () => {
  loadData();

  // Evento para cerrar modal al hacer clic fuera
  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', event => {
      if (event.target === modal) {
        modal.classList.add('hidden');
        currentTool = null;
        currentFuel = null;
      }
    });
  });

  // Evento para formularios
  document.getElementById('toolForm')?.addEventListener('submit', e => {
    e.preventDefault();
    addTool();
  });

  document.getElementById('fuelForm')?.addEventListener('submit', e => {
    e.preventDefault();
    addFuel();
  });

  // Eventos de filtros
  document.getElementById('searchInput')?.addEventListener('input', applyFilters);
  document.getElementById('dateFilter')?.addEventListener('change', applyFilters);
  document.getElementById('actionFilter')?.addEventListener('change', applyFilters);
  document.getElementById('costFilter')?.addEventListener('change', applyFilters);

  document.getElementById('fuelSearchInput')?.addEventListener('input', applyFuelFilters);
  document.getElementById('fuelTypeFilter')?.addEventListener('change', applyFuelFilters);
  document.getElementById('fuelAmountFilter')?.addEventListener('change', applyFuelFilters);

  // Eventos de botones de acción masiva
  document.getElementById('deleteSelectedToolsBtn')?.addEventListener('click', deleteSelectedTools);
  document.getElementById('selectAllToolsBtn')?.addEventListener('click', selectAllTools);
  document.getElementById('editSelectedToolsBtn')?.addEventListener('click', editSelectedTools);

  document.getElementById('deleteSelectedFuelsBtn')?.addEventListener('click', deleteSelectedFuels);
  document.getElementById('selectAllFuelsBtn')?.addEventListener('click', selectAllFuels);
  document.getElementById('editSelectedFuelsBtn')?.addEventListener('click', editSelectedFuels);

  // Evento para importar
  document.getElementById('importToolsBtn')?.addEventListener('click', () => {
    document.getElementById('excelFile').click();
  });
  document.getElementById('excelFile')?.addEventListener('change', importTools);

  // Evento para exportar
  document.getElementById('exportToolsBtn')?.addEventListener('click', exportTools);

  // Evento para respaldo
  document.getElementById('backupDatabaseBtn')?.addEventListener('click', backupDatabase);

  // Eventos de configuración
  document.getElementById('addToolCategoryBtn')?.addEventListener('click', addToolCategory);
  document.getElementById('addFuelTypeBtn')?.addEventListener('click', addFuelType);

  // Evento para imprimir reporte
  document.getElementById('printToolReportBtn')?.addEventListener('click', printToolReport);

  // Navegación
  document.querySelectorAll('[data-section]').forEach(btn => {
    btn.addEventListener('click', () => showSection(btn.dataset.section));
  });

  document.getElementById('toggleSidebarBtn')?.addEventListener('click', toggleSidebar);
  document.getElementById('goBackBtn')?.addEventListener('click', goBack);
});

// Funciones de utilidad
function formatDate(date) {
  return new Date(date).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

function formatTime(date) {
  return new Date(date).toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Actualización periódica para verificar préstamos vencidos
function checkOverdueLoans() {
  const overdueTools = tools.filter(tool => isOverdue(tool));
  if (overdueTools.length > 0) {
    Swal.fire({
      icon: 'warning',
      title: 'Préstamos Vencidos',
      text: `Hay ${overdueTools.length} herramientas con préstamos vencidos.`,
      confirmButtonText: 'Ver Detalles',
      showCancelButton: true,
      cancelButtonText: 'Cerrar'
    }).then(result => {
      if (result.isConfirmed) {
        showSection('tools');
        renderTools();
      }
    });
  }
}

// Iniciar verificación periódica
setInterval(checkOverdueLoans, 60 * 60 * 1000); // Cada hora

// Manejo de errores global
window.addEventListener('error', event => {
  console.error('Error global:', event.error);
  Swal.fire({
    icon: 'error',
    title: 'Error Inesperado',
    text: 'Ha ocurrido un error. Por favor, intenta de nuevo o contacta al soporte.'
  });
});

// Manejo de promesas no capturadas
window.addEventListener('unhandledrejection', event => {
  console.error('Promesa no capturada:', event.reason);
  Swal.fire({
    icon: 'error',
    title: 'Error Inesperado',
    text: 'Ha ocurrido un error. Por favor, intenta de nuevo o contacta al soporte.'
  });
});

// Función para limpiar almacenamiento local (opcional, para depuración)
function clearLocalStorage() {
  Swal.fire({
    title: '¿Estás seguro?',
    text: 'Esto eliminará todos los datos almacenados localmente.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Eliminar',
    cancelButtonText: 'Cancelar'
  }).then(result => {
    if (result.isConfirmed) {
      localStorage.clear();
      tools = [];
      fuels = [];
      history = [];
      fuelHistory = [];
      settings = {
        toolCategories: [...TOOL_CATEGORIES],
        fuelTypes: [...FUEL_TYPES],
        toolStatuses: [...TOOL_STATUSES],
        locations: [...LOCATIONS]
      };
      saveSettings();
      renderTools();
      renderFuels();
      renderHistory();
      renderFuelHistory();
      renderSettings();
      updateFormOptions();
      Swal.fire({
        icon: 'success',
        title: 'Datos Eliminados',
        text: 'El almacenamiento local ha sido limpiado.',
        timer: 1500
      });
    }
  });
}

// Función para validar formularios en tiempo real
function setupFormValidation(formId, fields) {
  const form = document.getElementById(formId);
  if (!form) return;

  fields.forEach(field => {
    const input = document.getElementById(field.id);
    if (input) {
      input.addEventListener('input', debounce(() => {
        const error = field.validate(input.value);
        const errorElement = document.getElementById(`${field.id}Error`);
        if (errorElement) {
          errorElement.textContent = error || '';
          errorElement.classList.toggle('hidden', !error);
        }
      }, 300));
    }
  });
}

// Configurar validación en tiempo real para formularios
setupFormValidation('toolForm', [
  { id: 'toolName', validate: value => validateName(value, tools) },
  { id: 'toolQuantity', validate: value => validateQuantity(value, 1000, 'unidades') },
  { id: 'toolWeight', validate: validateWeight },
  { id: 'toolCategory', validate: validateCategory },
  { id: 'toolStatus', validate: validateStatus },
  { id: 'toolLocation', validate: validateLocation }
]);

setupFormValidation('fuelForm', [
  { id: 'fuelName', validate: value => validateName(value, fuels) },
  { id: 'fuelQuantity', validate: value => validateQuantity(value, 1000, 'litros') },
  { id: 'fuelType', validate: value => !value ? 'El tipo de bencina es obligatorio.' : null },
  { id: 'fuelAmount', validate: validateAmount },
  { id: 'fuelDate', validate: validateDate },
  { id: 'fuelOdometer', validate: validateOdometer }
]);

// Función para manejar cambios en la configuración
function updateSettings() {
  const toolCategoriesInput = document.getElementById('newToolCategory');
  const fuelTypesInput = document.getElementById('newFuelType');

  if (toolCategoriesInput) {
    toolCategoriesInput.addEventListener('keypress', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addToolCategory();
      }
    });
  }

  if (fuelTypesInput) {
    fuelTypesInput.addEventListener('keypress', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addFuelType();
      }
    });
  }
}

// Inicializar manejo de configuración
updateSettings();

// Función para generar estadísticas básicas
function generateStats() {
  const toolStats = {
    total: tools.length,
    available: tools.filter(t => t.status === 'Disponible').length,
    loaned: tools.filter(t => t.status === 'Prestado').length,
    maintenance: tools.filter(t => t.status === 'En mantenimiento').length,
    damaged: tools.filter(t => t.status === 'Dañado').length,
    lost: tools.filter(t => t.status === 'Perdido').length
  };

  const fuelStats = {
    total: fuels.length,
    totalLiters: fuels.reduce((sum, f) => sum + parseFloat(f.quantity), 0).toFixed(2),
    totalAmount: fuels.reduce((sum, f) => sum + parseFloat(f.amount), 0).toFixed(0),
    byType: settings.fuelTypes.reduce((acc, type) => ({
      ...acc,
      [type]: fuels.filter(f => f.type === type).length
    }), {})
  };

  return { toolStats, fuelStats };
}

// Mostrar estadísticas
function showStats() {
  const stats = generateStats();
  Swal.fire({
    title: 'Estadísticas',
    html: `
      <h3>Herramientas</h3>
      <p>Total: ${stats.toolStats.total}</p>
      <p>Disponibles: ${stats.toolStats.available}</p>
      <p>Prestadas: ${stats.toolStats.loaned}</p>
      <p>En mantenimiento: ${stats.toolStats.maintenance}</p>
      <p>Dañadas: ${stats.toolStats.damaged}</p>
      <p>Perdidas: ${stats.toolStats.lost}</p>
      <h3 class="mt-4">Bencinas</h3>
      <p>Total de cargas: ${stats.fuelStats.total}</p>
      <p>Total de litros: ${stats.fuelStats.totalLiters} L</p>
      <p>Monto total: $${stats.fuelStats.totalAmount}</p>
      <p>Por tipo:</p>
      ${Object.entries(stats.fuelStats.byType).map(([type, count]) => `<p>${type}: ${count}</p>`).join('')}
    `,
    confirmButtonText: 'Cerrar',
    width: '600px'
  });
}

// Agregar evento para mostrar estadísticas
document.getElementById('showStatsBtn')?.addEventListener('click', showStats);

// Función para manejar imágenes grandes
function compressImage(file, callback) {
  if (!file) return callback(null);
  
  const reader = new FileReader();
  reader.onload = function(event) {
    const img = new Image();
    img.src = event.target.result;
    img.onload = function() {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Definir tamaño máximo
      const MAX_WIDTH = 800;
      const MAX_HEIGHT = 800;
      let width = img.width;
      let height = img.height;

      // Calcular proporciones
      if (width > height) {
        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }
      } else {
        if (height > MAX_HEIGHT) {
          width = Math.round((width * MAX_HEIGHT) / height);
          height = MAX_HEIGHT;
        }
      }

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);
      
      // Convertir a base64 con compresión
      canvas.toBlob(
        blob => {
          const reader = new FileReader();
          reader.onloadend = () => callback(reader.result);
          reader.readAsDataURL(blob);
        },
        'image/jpeg',
        0.7 // Calidad de compresión
      );
    };
  };
  reader.readAsDataURL(file);
}

// Modificar funciones que manejan imágenes para usar compresión
function addToolWithCompression() {
  const name = document.getElementById('toolName').value.trim();
  const quantity = document.getElementById('toolQuantity').value;
  const weight = document.getElementById('toolWeight').value;
  const category = document.getElementById('toolCategory').value;
  const status = document.getElementById('toolStatus').value;
  const location = document.getElementById('toolLocation').value;
  const details = document.getElementById('toolDetails').value.trim();
  const photoFile = document.getElementById('toolPhoto').files[0];

  const nameError = validateName(name, tools);
  const quantityError = validateQuantity(quantity, 1000, 'unidades');
  const weightError = validateWeight(weight);
  const categoryError = validateCategory(category);
  const statusError = validateStatus(status);
  const locationError = validateLocation(location);
  const photoError = validateImage(photoFile);

  if (nameError || quantityError || weightError || categoryError || statusError || locationError || photoError) {
    Swal.fire({
      icon: 'error',
      title: 'Error',
      html: [nameError, quantityError, weightError, categoryError, statusError, locationError, photoError].filter(e => e).join('<br>')
    });
    return;
  }

  compressImage(photoFile, photo => {
    const newTool = {
      id: tools.length > 0 ? Math.max(...tools.map(t => t.id)) + 1 : 1,
      name,
      quantity: parseInt(quantity),
      weight: parseFloat(weight).toFixed(2),
      category,
      status,
      location,
      details,
      photo,
      registerDate: new Date().toLocaleDateString('es-ES'),
      loanedAt: null,
      lastUpdated: new Date().toISOString()
    };
    tools.push(newTool);
    saveTools();
    renderTools();
    clearToolForm();
    Swal.fire({
      icon: 'success',
      title: 'Éxito',
      text: 'Herramienta agregada correctamente.',
      timer: 1500
    });
  });
}

function addFuelWithCompression() {
  const name = document.getElementById('fuelName').value.trim();
  const quantity = document.getElementById('fuelQuantity').value;
  const type = document.getElementById('fuelType').value;
  const amount = document.getElementById('fuelAmount').value;
  const date = document.getElementById('fuelDate').value;
  const vehicle = document.getElementById('fuelVehicle').value.trim();
  const odometer = document.getElementById('fuelOdometer').value;
  const details = document.getElementById('fuelDetails').value.trim();
  const receiptFile = document.getElementById('fuelReceipt').files[0];

  const nameError = validateName(name, fuels);
  const quantityError = validateQuantity(quantity, 1000, 'litros');
  const typeError = !type ? 'El tipo de bencina es obligatorio.' : null;
  const amountError = validateAmount(amount);
  const dateError = validateDate(date);
  const odometerError = validateOdometer(odometer);
  const receiptError = validateImage(receiptFile);

  if (nameError || quantityError || typeError || amountError || dateError || odometerError || receiptError) {
    Swal.fire({
      icon: 'error',
      title: 'Error',
      html: [nameError, quantityError, typeError, amountError, dateError, odometerError, receiptError].filter(e => e).join('<br>')
    });
    return;
  }

  compressImage(receiptFile, receipt => {
    const newFuel = {
      id: fuels.length > 0 ? Math.max(...fuels.map(f => f.id)) + 1 : 1,
      name,
      quantity: parseFloat(quantity).toFixed(2),
      type,
      amount: parseFloat(amount).toFixed(0),
      date: new Date(date).toLocaleDateString('es-ES'),
      vehicle: vehicle || null,
      odometer: odometer ? parseInt(odometer) : null,
      details: details || null,
      receipt,
      lastUpdated: new Date().toISOString()
    };
    fuels.push(newFuel);
    addFuelHistoryItem(newFuel);
    saveFuels();
    renderFuels();
    clearFuelForm();
    Swal.fire({
      icon: 'success',
      title: 'Éxito',
      text: 'Bencina agregada correctamente.',
      timer: 1500
    });
  });
}

// Reemplazar funciones originales con las que usan compresión
document.getElementById('toolForm')?.removeEventListener('submit', addTool);
document.getElementById('toolForm')?.addEventListener('submit', e => {
  e.preventDefault();
  addToolWithCompression();
});

document.getElementById('fuelForm')?.removeEventListener('submit', addFuel);
document.getElementById('fuelForm')?.addEventListener('submit', e => {
  e.preventDefault();
  addFuelWithCompression();
});

// Función para restaurar respaldo
function restoreBackup() {
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.xlsx';
  
  fileInput.onchange = function(event) {
    const file = event.target.files[0];
    if (!file) return;

    Swal.fire({
      title: '¿Estás seguro?',
      text: 'Esto sobrescribirá todos los datos actuales. Asegúrate de tener un respaldo antes de continuar.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Restaurar',
      cancelButtonText: 'Cancelar'
    }).then(result => {
      if (result.isConfirmed) {
        const reader = new FileReader();
        reader.onload = function(e) {
          try {
            const workbook = XLSX.read(e.target.result, { type: 'binary', cellDates: true });
            
            // Restaurar herramientas
            if (workbook.SheetNames.includes('Herramientas')) {
              const sheet = workbook.Sheets['Herramientas'];
              tools = XLSX.utils.sheet_to_json(sheet).map(row => ({
                id: parseInt(row['ID']) || 1,
                name: String(row['Nombre']).trim(),
                quantity: parseInt(row['Cantidad']) || 0,
                weight: parseFloat(row['Peso (kg)']).toFixed(2) || '0.00',
                category: String(row['Categoría']).trim() || 'General',
                status: String(row['Estado']).trim() || 'Disponible',
                location: String(row['Ubicación']).trim() || settings.locations[0] || 'Bodega A',
                details: String(row['Detalles']).trim() || '',
                registerDate: String(row['Fecha Registro']) || new Date().toLocaleDateString('es-ES'),
                photo: row['Foto'] || null,
                loanedAt: null,
                lastUpdated: row['Última Actualización'] ? new Date(row['Última Actualización']).toISOString() : new Date().toISOString()
              }));
            }

            // Restaurar bencinas
            if (workbook.SheetNames.includes('Bencinas')) {
              const sheet = workbook.Sheets['Bencinas'];
              fuels = XLSX.utils.sheet_to_json(sheet).map(row => ({
                id: parseInt(row['ID']) || 1,
                name: String(row['Responsable']).trim() || 'Sin responsable',
                quantity: parseFloat(row['Cantidad (litros)']).toFixed(2) || '0.00',
                type: String(row['Tipo']).trim() || settings.fuelTypes[0] || 'Sin tipo',
                amount: parseFloat(row['Monto']).toFixed(0) || '0',
                date: String(row['Fecha']) || new Date().toLocaleDateString('es-ES'),
                vehicle: String(row['Vehículo']).trim() || null,
                odometer: parseInt(row['Kilometraje']) || null,
                details: String(row['Detalles']).trim() || null,
                receipt: row['Boleta'] || null,
                lastUpdated: row['Última Actualización'] ? new Date(row['Última Actualización']).toISOString() : new Date().toISOString()
              }));
            }

            // Restaurar historial de herramientas
            if (workbook.SheetNames.includes('Historial Herramientas')) {
              const sheet = workbook.Sheets['Historial Herramientas'];
              history = XLSX.utils.sheet_to_json(sheet).map(row => ({
                toolId: parseInt(row['ID Herramienta']) || 0,
                toolName: String(row['Herramienta']).trim(),
                action: String(row['Acción']).trim(),
                date: String(row['Fecha']).trim(),
                time: String(row['Hora']).trim(),
                responsible: String(row['Responsable']).trim(),
                detail: String(row['Detalle']).trim(),
                location: String(row['Ubicación']).trim() || '',
                status: String(row['Estado']).trim() || ''
              }));
            }

            // Restaurar historial de bencinas
            if (workbook.SheetNames.includes('Historial Bencinas')) {
              const sheet = workbook.Sheets['Historial Bencinas'];
              fuelHistory = XLSX.utils.sheet_to_json(sheet).map(row => ({
                id: parseInt(row['ID Carga']) || 1,
                ResponsableCarga: String(row['Responsable']).trim(),
                quantity: parseFloat(row['Cantidad (litros)']) || 0,
                type: String(row['Tipo']).trim(),
                amount: parseFloat(row['Monto']) || 0,
                date: String(row['Fecha']).trim(),
                vehicle: String(row['Vehículo']).trim() || null,
                odometer: parseInt(row['Kilometraje']) || null,
                details: String(row['Detalles']).trim() || null,
                receipt: row['Boleta'] || null
              }));
            }

            // Actualizar categorías y tipos
            settings.toolCategories = [...new Set([...settings.toolCategories, ...tools.map(t => t.category)])];
            settings.fuelTypes = [...new Set([...settings.fuelTypes, ...fuels.map(f => f.type)])];
            settings.locations = [...new Set([...settings.locations, ...tools.map(t => t.location)])];

            saveTools();
            saveFuels();
            saveHistory();
            saveFuelHistory();
            saveSettings();
            renderTools();
            renderFuels();
            renderHistory();
            renderFuelHistory();
            renderSettings();
            updateFormOptions();

            Swal.fire({
              icon: 'success',
              title: 'Restauración Exitosa',
              text: 'Los datos han sido restaurados correctamente.',
              timer: 2000
            });
          } catch (error) {
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: 'Error al restaurar el respaldo: ' + error.message
            });
          }
        };
        reader.readAsBinaryString(file);
      }
    });
  };
  
  fileInput.click();
}

// Agregar evento para restaurar respaldo
document.getElementById('restoreBackupBtn')?.addEventListener('click', restoreBackup);

// Función para generar notificaciones
function setupNotifications() {
  if (!('Notification' in window)) {
    console.log('Notificaciones no soportadas en este navegador.');
    return;
  }

  Notification.requestPermission().then(permission => {
    if (permission === 'granted') {
      setInterval(() => {
        const overdueTools = tools.filter(tool => isOverdue(tool));
        if (overdueTools.length > 0) {
          new Notification('Préstamos Vencidos', {
            body: `Hay ${overdueTools.length} herramientas con préstamos vencidos.`,
            icon: 'path/to/icon.png' // Reemplazar con ruta real del ícono
          });
        }
      }, 60 * 60 * 1000); // Cada hora
    }
  });
}

// Inicializar notificaciones
setupNotifications();

// Función para manejar atajos de teclado
function setupKeyboardShortcuts() {
  document.addEventListener('keydown', event => {
    // Ctrl + T: Mostrar sección de herramientas
    if (event.ctrlKey && event.key === 't') {
      event.preventDefault();
      showSection('tools');
    }
    // Ctrl + F: Mostrar sección de bencinas
    if (event.ctrlKey && event.key === 'f') {
      event.preventDefault();
      showSection('fuels');
    }
    // Ctrl + H: Mostrar sección de historial
    if (event.ctrlKey && event.key === 'h') {
      event.preventDefault();
      showSection('history');
    }
    // Ctrl + S: Mostrar estadísticas
    if (event.ctrlKey && event.key === 's') {
      event.preventDefault();
      showStats();
    }
    // Ctrl + B: Crear respaldo
    if (event.ctrlKey && event.key === 'b') {
      event.preventDefault();
      backupDatabase();
    }
  });
}

// Inicializar atajos de teclado
setupKeyboardShortcuts();

// Exportar funciones para uso global (si es necesario)
window.showSection = showSection;
window.toggleSidebar = toggleSidebar;
window.goBack = goBack;
window.addToolCategory = addToolCategory;
window.removeToolCategory = removeToolCategory;
window.addFuelType = addFuelType;
window.removeFuelType = removeFuelType;
window.loanTool = loanTool;
window.returnTool = returnTool;
window.showToolDetails = showToolDetails;
window.showFuelDetails = showFuelDetails;
window.printToolReport = printToolReport;
window.applyFilters = applyFilters;
window.applyFuelFilters = applyFuelFilters;
window.deleteSelectedTools = deleteSelectedTools;
window.deleteSelectedFuels = deleteSelectedFuels;
window.selectAllTools = selectAllTools;
window.selectAllFuels = selectAllFuels;
window.editSelectedTools = editSelectedTools;
window.editSelectedFuels = editSelectedFuels;
window.importTools = importTools;
window.exportTools = exportTools;
window.backupDatabase = backupDatabase;
window.restoreBackup = restoreBackup;
window.showStats = showStats;

// Función para manejar la sincronización con un servidor (futuro)
function syncWithServer() {
  // Placeholder para sincronización con servidor
  return new Promise((resolve, reject) => {
    // Simulación de sincronización
    setTimeout(() => {
      try {
        // Aquí iría la lógica real de sincronización con API
        console.log('Sincronizando datos con el servidor...');
        resolve('Sincronización completada');
      } catch (error) {
        reject('Error en la sincronización: ' + error.message);
      }
    }, 1000);
  });
}

// Función para iniciar sincronización periódica
function setupServerSync() {
  // Sincronizar cada 30 minutos
  setInterval(() => {
    syncWithServer()
      .then(message => {
        console.log(message);
      })
      .catch(error => {
        console.error(error);
        Swal.fire({
          icon: 'error',
          title: 'Error de Sincronización',
          text: 'No se pudo sincronizar con el servidor. Verifica tu conexión.'
        });
      });
  }, 30 * 60 * 1000);
}

// Inicializar sincronización con servidor
setupServerSync();

// Función para manejar actualizaciones de la aplicación
function checkForUpdates() {
  // Placeholder para verificación de actualizaciones
  fetch('/version.json') // Suponiendo que hay un archivo version.json
    .then(response => response.json())
    .then(data => {
      const currentVersion = '1.0.0'; // Versión actual de la app
      if (data.version > currentVersion) {
        Swal.fire({
          icon: 'info',
          title: 'Actualización Disponible',
          text: `Hay una nueva versión (${data.version}) disponible.`,
          showCancelButton: true,
          confirmButtonText: 'Actualizar',
          cancelButtonText: 'Más tarde'
        }).then(result => {
          if (result.isConfirmed) {
            window.location.reload(true); // Forzar recarga de la caché
          }
        });
      }
    })
    .catch(error => {
      console.error('Error al verificar actualizaciones:', error);
    });
}

// Verificar actualizaciones al cargar
checkForUpdates();

// Función para generar reportes PDF
function generatePDFReport(type) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  
  doc.setFontSize(18);
  doc.text(type === 'tools' ? 'Reporte de Herramientas' : 'Reporte de Bencinas', 20, 20);
  
  doc.setFontSize(12);
  doc.text(`Fecha: ${new Date().toLocaleDateString('es-ES')}`, 20, 30);
  
  let y = 40;
  
  if (type === 'tools') {
    tools.forEach((tool, index) => {
      doc.text(`Herramienta ${index + 1}`, 20, y);
      doc.text(`Nombre: ${tool.name}`, 20, y + 5);
      doc.text(`Cantidad: ${tool.quantity}`, 20, y + 10);
      doc.text(`Peso: ${tool.weight} kg`, 20, y + 15);
      doc.text(`Estado: ${tool.status}`, 20, y + 20);
      doc.text(`Ubicación: ${tool.location}`, 20, y + 25);
      y += 35;
      if (y > 260) {
        doc.addPage();
        y = 20;
      }
    });
  } else {
    fuels.forEach((fuel, index) => {
      doc.text(`Carga ${index + 1}`, 20, y);
      doc.text(`Responsable: ${fuel.name}`, 20, y + 5);
      doc.text(`Cantidad: ${fuel.quantity} litros`, 20, y + 10);
      doc.text(`Tipo: ${fuel.type}`, 20, y + 15);
      doc.text(`Monto: $${fuel.amount}`, 20, y + 20);
      doc.text(`Fecha: ${fuel.date}`, 20, y + 25);
      y += 35;
      if (y > 260) {
        doc.addPage();
        y = 20;
      }
    });
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  doc.save(`Reporte_${type}_${timestamp}.pdf`);
}

// Agregar eventos para generar reportes PDF
document.getElementById('generateToolsPDFBtn')?.addEventListener('click', () => generatePDFReport('tools'));
document.getElementById('generateFuelsPDFBtn')?.addEventListener('click', () => generatePDFReport('fuels'));

// Función para manejar modo offline
function setupOfflineMode() {
  window.addEventListener('online', () => {
    console.log('Conexión restaurada. Sincronizando datos...');
    syncWithServer();
  });

  window.addEventListener('offline', () => {
    Swal.fire({
      icon: 'warning',
      title: 'Sin Conexión',
      text: 'Estás en modo offline. Los datos se sincronizarán cuando se restablezca la conexión.'
    });
  });

  // Verificar estado inicial
  if (!navigator.onLine) {
    Swal.fire({
      icon: 'warning',
      title: 'Sin Conexión',
      text: 'Estás en modo offline. Los datos se sincronizarán cuando se restablezca la conexión.'
    });
  }
}

// Inicializar modo offline
setupOfflineMode();

// Función para exportar configuración
function exportSettings() {
  const settingsData = JSON.stringify(settings, null, 2);
  const blob = new Blob([settingsData], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `CrisoullManager_Settings_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// Función para importar configuración
function importSettings() {
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.json';
  
  fileInput.onchange = function(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const importedSettings = JSON.parse(e.target.result);
        settings = {
          toolCategories: importedSettings.toolCategories || [...TOOL_CATEGORIES],
          fuelTypes: importedSettings.fuelTypes || [...FUEL_TYPES],
          toolStatuses: importedSettings.toolStatuses || [...TOOL_STATUSES],
          locations: importedSettings.locations || [...LOCATIONS]
        };
        saveSettings();
        renderSettings();
        updateFormOptions();
        Swal.fire({
          icon: 'success',
          title: 'Configuración Importada',
          text: 'La configuración ha sido importada correctamente.'
        });
      } catch (error) {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Error al importar configuración: ' + error.message
        });
      }
    };
    reader.readAsText(file);
  };
  
  fileInput.click();
}

// Agregar eventos para configuración
document.getElementById('exportSettingsBtn')?.addEventListener('click', exportSettings);
document.getElementById('importSettingsBtn')?.addEventListener('click', importSettings);

// Función para manejar búsqueda avanzada
function setupAdvancedSearch() {
  const toolSearchInput = document.getElementById('searchInput');
  const fuelSearchInput = document.getElementById('fuelSearchInput');

  if (toolSearchInput) {
    toolSearchInput.addEventListener('input', debounce(() => {
      const query = toolSearchInput.value.toLowerCase();
      if (query.length >= 3) {
        const results = tools.filter(tool =>
          tool.name.toLowerCase().includes(query) ||
          tool.details.toLowerCase().includes(query) ||
          tool.category.toLowerCase().includes(query) ||
          tool.location.toLowerCase().includes(query)
        );
        renderTools(1, 10); // Renderizar con filtros aplicados
      }
    }, 500));
  }

  if (fuelSearchInput) {
    fuelSearchInput.addEventListener('input', debounce(() => {
      const query = fuelSearchInput.value.toLowerCase();
      if (query.length >= 3) {
        const results = fuels.filter(fuel =>
          fuel.name.toLowerCase().includes(query) ||
          fuel.type.toLowerCase().includes(query) ||
          fuel.vehicle?.toLowerCase().includes(query) ||
          fuel.details?.toLowerCase().includes(query)
        );
        renderFuels(1, 10); // Renderizar con filtros aplicados
      }
    }, 500));
  }
}

// Inicializar búsqueda avanzada
setupAdvancedSearch();

// Función para generar gráficos de estadísticas
function generateStatsCharts() {
  const stats = generateStats();
  
  // Gráfico de herramientas
  const toolChartCtx = document.getElementById('toolStatsChart')?.getContext('2d');
  if (toolChartCtx) {
    new Chart(toolChartCtx, {
      type: 'pie',
      data: {
        labels: ['Disponibles', 'Prestadas', 'En mantenimiento', 'Dañadas', 'Perdidas'],
        datasets: [{
          data: [
            stats.toolStats.available,
            stats.toolStats.loaned,
            stats.toolStats.maintenance,
            stats.toolStats.damaged,
            stats.toolStats.lost
          ],
          backgroundColor: ['#36A2EB', '#FFCE56', '#FF6384', '#4BC0C0', '#9966FF']
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'top' },
          title: { display: true, text: 'Distribución de Herramientas' }
        }
      }
    });
  }

  // Gráfico de bencinas
  const fuelChartCtx = document.getElementById('fuelStatsChart')?.getContext('2d');
  if (fuelChartCtx) {
    new Chart(fuelChartCtx, {
      type: 'bar',
      data: {
        labels: Object.keys(stats.fuelStats.byType),
        datasets: [{
          label: 'Cargas por Tipo',
          data: Object.values(stats.fuelStats.byType),
          backgroundColor: '#36A2EB'
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'top' },
          title: { display: true, text: 'Cargas de Combustible por Tipo' }
        },
        scales: {
          y: { beginAtZero: true }
        }
      }
    });
  }
}

// Inicializar gráficos
document.getElementById('statsSection')?.addEventListener('click', () => {
  setTimeout(generateStatsCharts, 100); // Esperar a que la sección esté visible
});

// Función para manejar drag and drop de imágenes
function setupImageDragAndDrop() {
  const dropZones = document.querySelectorAll('.image-drop-zone');
  dropZones.forEach(zone => {
    zone.addEventListener('dragover', e => {
      e.preventDefault();
      zone.classList.add('dragover');
    });

    zone.addEventListener('dragleave', () => {
      zone.classList.remove('dragover');
    });

    zone.addEventListener('drop', e => {
      e.preventDefault();
      zone.classList.remove('dragover');
      const file = e.dataTransfer.files[0];
      const inputId = zone.dataset.input;
      const input = document.getElementById(inputId);
      if (file && input) {
        const error = validateImage(file);
        if (error) {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error
          });
          return;
        }
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        input.files = dataTransfer.files;
        input.dispatchEvent(new Event('change'));
      }
    });
  });
}

// Inicializar drag and drop
setupImageDragAndDrop();

// Función para manejar vistas previas de imágenes
function setupImagePreview() {
  const inputs = document.querySelectorAll('input[type="file"][accept^="image/"]');
  inputs.forEach(input => {
    input.addEventListener('change', () => {
      const file = input.files[0];
      const previewId = input.dataset.preview;
      const preview = document.getElementById(previewId);
      if (file && preview) {
        compressImage(file, dataUrl => {
          preview.src = dataUrl;
          preview.classList.remove('hidden');
        });
      }
    });
  });
}

// Inicializar vistas previas
setupImagePreview();

// Función para manejar temas (claro/oscuro)
function setupThemeToggle() {
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    const currentTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.classList.toggle('dark', currentTheme === 'dark');
    themeToggle.checked = currentTheme === 'dark';

    themeToggle.addEventListener('change', () => {
      const isDark = themeToggle.checked;
      document.documentElement.classList.toggle('dark', isDark);
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
    });
  }
}

// Inicializar tema
setupThemeToggle();

// Función para manejar accesibilidad
function setupAccessibility() {
  const increaseFontBtn = document.getElementById('increaseFont');
  const decreaseFontBtn = document.getElementById('decreaseFont');
  let fontSize = parseInt(localStorage.getItem('fontSize')) || 16;

  const updateFontSize = () => {
    document.documentElement.style.fontSize = `${fontSize}px`;
    localStorage.setItem('fontSize', fontSize);
  };

  if (increaseFontBtn) {
    increaseFontBtn.addEventListener('click', () => {
      if (fontSize < 24) {
        fontSize += 2;
        updateFontSize();
      }
    });
  }

  if (decreaseFontBtn) {
    decreaseFontBtn.addEventListener('click', () => {
      if (fontSize > 12) {
        fontSize -= 2;
        updateFontSize();
      }
    });
  }

  updateFontSize();
}

// Inicializar accesibilidad
setupAccessibility();

// Función para manejar multi-idioma (futuro)
function setupLanguage() {
  const languageSelect = document.getElementById('languageSelect');
  if (languageSelect) {
    const translations = {
      es: {
        title: 'Crisoull Manager',
        tools: 'Herramientas',
        fuels: 'Bencinas',
        history: 'Historial'
      },
      en: {
        title: 'Crisoull Manager',
        tools: 'Tools',
        fuels: 'Fuels',
        history: 'History'
      }
    };

    languageSelect.addEventListener('change', () => {
      const lang = languageSelect.value;
      localStorage.setItem('language', lang);
      document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.dataset.i18n;
        element.textContent = translations[lang][key] || element.textContent;
      });
    });

    const savedLang = localStorage.getItem('language') || 'es';
    languageSelect.value = savedLang;
    languageSelect.dispatchEvent(new Event('change'));
  }
}

// Inicializar multi-idioma
setupLanguage();

// Finalización del script
console.log('Crisoull Manager inicializado correctamente.');