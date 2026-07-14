// ===== CONFIGURACIÓN =====
// Reemplaza con tus datos de Supabase (Settings → API en el dashboard)
const SUPABASE_URL = 'https://ccouvrcotswtmoeesjkk.sb.co';     // https://xxxxxxxxxxxx.sb.co
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNjb3V2cmNvdHN3dG1vZWVzamtrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQwMTMyMjMsImV4cCI6MjA5OTU4OTIyM30.fmhhpQAHA7Qb-lJMpdH9wtfJKqsjz-TNC6au09FZ4EE';     // eyJhbGciOi...

// ===== CLIENTE SUPABASE =====
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== CONSTANTES =====
const CATEGORIES = [
  'Lácteos', 'Fruta y Verdura', 'Carne y Pescado', 'Pan y Bollería',
  'Bebidas', 'Limpieza', 'Higiene', 'Congelados', 'Pasta y Arroz',
  'Salsas y Especias', 'Snacks', 'Otros'
];

const STORAGE_KEY = 'family_listing_pin';

// ===== ESTADO =====
let products = [];
let members = [];
let productHistory = [];

// ===== REFERENCIAS DOM =====
const $ = (sel) => document.querySelector(sel);

// Screens
const pinScreen = $('#pin-screen');
const appScreen = $('#app-screen');

// PIN
const pinForm = $('#pin-form');
const pinInput = $('#pin-input');
const pinError = $('#pin-error');

// Add form
const addForm = $('#add-form');
const addName = $('#add-name');
const addQuantity = $('#add-quantity');
const addCategory = $('#add-category');
const addAddedBy = $('#add-addedby');
const addStore = $('#add-store');

// List
const productList = $('#product-list');
const listLoading = $('#list-loading');
const listEmpty = $('#list-empty');
const listCount = $('#list-count');
const clearBtn = $('#clear-btn');
const clearDropdown = $('#clear-dropdown');

// Edit
const editOverlay = $('#edit-overlay');
const editForm = $('#edit-form');
const editId = $('#edit-id');
const editName = $('#edit-name');
const editQuantity = $('#edit-quantity');
const editCategory = $('#edit-category');
const editAddedBy = $('#edit-addedby');
const editStore = $('#edit-store');
const editCancel = $('#edit-cancel');

// Other
const logoutBtn = $('#logout-btn');
const toast = $('#toast');

// ===== AUTH =====

function isAuthenticated() {
  return localStorage.getItem(STORAGE_KEY) !== null;
}

async function validatePin(pin) {
  const { data, error } = await sb
    .from('settings')
    .select('value')
    .eq('key', 'family_pin')
    .single();

  if (error) {
    console.error('Error fetching PIN:', error);
    return false;
  }

  return data.value === pin;
}

function showPinScreen() {
  pinScreen.classList.add('active');
  appScreen.classList.remove('active');
  pinInput.focus();
}

function showAppScreen() {
  pinScreen.classList.remove('active');
  appScreen.classList.add('active');
  initApp();
}

async function handlePinSubmit(e) {
  e.preventDefault();
  const pin = pinInput.value.trim();

  if (!pin) return;

  const submitBtn = $('#pin-submit');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Verificando...';

  const valid = await validatePin(pin);

  if (valid) {
    localStorage.setItem(STORAGE_KEY, pin);
    pinError.classList.add('hidden');
    pinInput.value = '';
    showAppScreen();
  } else {
    pinError.classList.remove('hidden');
    pinInput.value = '';
    pinInput.focus();
  }

  submitBtn.disabled = false;
  submitBtn.textContent = 'Entrar';
}

function logout() {
  localStorage.removeItem(STORAGE_KEY);
  products = [];
  showPinScreen();
}

// ===== SETTINGS =====

async function fetchSettings() {
  const { data, error } = await sb
    .from('settings')
    .select('key, value');

  if (error) {
    console.error('Error fetching settings:', error);
    return;
  }

  const membersRow = data.find(s => s.key === 'members');
  if (membersRow) {
    members = membersRow.value.split(',').map(m => m.trim());
  }

  populateSelectors();
}

function populateSelectors() {
  // Categorías
  const categoryHTML = CATEGORIES.map(c => `<option value="${c}">${c}</option>`).join('');
  addCategory.innerHTML = '<option value="">Categoría *</option>' + categoryHTML;
  editCategory.innerHTML = '<option value="">Categoría</option>' + categoryHTML;

  // Miembros
  const membersHTML = members.map(m => `<option value="${m}">${m}</option>`).join('');
  addAddedBy.innerHTML = '<option value="">Quién *</option>' + membersHTML;
  editAddedBy.innerHTML = '<option value="">Quién</option>' + membersHTML;
}

// ===== PRODUCTS =====

async function fetchProducts() {
  const { data, error } = await sb
    .from('products')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching products:', error);
    showToast('Error al cargar la lista');
    return;
  }

  products = data || [];
  renderProducts();
}

function renderProducts() {
  listLoading.classList.add('hidden');

  if (products.length === 0) {
    listEmpty.classList.remove('hidden');
    productList.innerHTML = '';
  } else {
    listEmpty.classList.add('hidden');
    productList.innerHTML = products.map(p => `
      <li class="product-item${p.purchased ? ' purchased' : ''}" data-id="${p.id}">
        <div class="product-checkbox${p.purchased ? ' checked' : ''}"
             onclick="togglePurchased('${p.id}', ${p.purchased})">
          ${p.purchased ? '✓' : ''}
        </div>
        <div class="product-info">
          <div class="product-name">${escapeHtml(p.name)}</div>
          <div class="product-details">
            <span class="product-detail">🔢 ${escapeHtml(p.quantity)}</span>
            <span class="product-detail">📂 ${escapeHtml(p.category)}</span>
            <span class="product-detail">👤 ${escapeHtml(p.added_by)}</span>
            ${p.store ? `<span class="product-detail">🏪 ${escapeHtml(p.store)}</span>` : ''}
          </div>
        </div>
        <div class="product-actions">
          <button class="btn btn-ghost btn-sm" onclick="openEdit('${p.id}')" title="Editar">✏️</button>
          <button class="btn btn-ghost btn-sm" onclick="deleteProduct('${p.id}')" title="Eliminar">🗑️</button>
        </div>
      </li>
    `).join('');
  }

  updateListCount();
}

function updateListCount() {
  const pending = products.filter(p => !p.purchased).length;
  listCount.textContent = `${products.length} productos (${pending} pendientes)`;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

async function addProduct(e) {
  e.preventDefault();

  const product = {
    name: addName.value.trim(),
    quantity: addQuantity.value.trim(),
    category: addCategory.value,
    added_by: addAddedBy.value,
    store: addStore.value.trim() || null
  };

  if (!product.name || !product.quantity || !product.category || !product.added_by) {
    showToast('Rellena todos los campos obligatorios');
    return;
  }

  const { error } = await sb.from('products').insert(product);

  if (error) {
    console.error('Error adding product:', error);
    showToast('Error al añadir producto');
    return;
  }

  // Guardar en historial para sugerencias
  await recordToHistory(product.name);

  // Limpiar formulario
  addForm.reset();
  addName.focus();

  showToast('✅ Producto añadido');
}

async function togglePurchased(id, currentState) {
  const { error } = await sb
    .from('products')
    .update({ purchased: !currentState })
    .eq('id', id);

  if (error) {
    console.error('Error toggling product:', error);
    showToast('Error al actualizar');
  }
}

async function deleteProduct(id) {
  if (!confirm('¿Eliminar este producto?')) return;

  const { error } = await sb
    .from('products')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting product:', error);
    showToast('Error al eliminar');
  } else {
    showToast('🗑️ Producto eliminado');
  }
}

// ===== EDIT =====

function openEdit(id) {
  const product = products.find(p => p.id === id);
  if (!product) return;

  editId.value = product.id;
  editName.value = product.name;
  editQuantity.value = product.quantity;
  editCategory.value = product.category;
  editAddedBy.value = product.added_by;
  editStore.value = product.store || '';

  editOverlay.classList.remove('hidden');
  editName.focus();
}

function closeEdit() {
  editOverlay.classList.add('hidden');
  editForm.reset();
}

async function saveEdit(e) {
  e.preventDefault();

  const updates = {
    name: editName.value.trim(),
    quantity: editQuantity.value.trim(),
    category: editCategory.value,
    added_by: editAddedBy.value,
    store: editStore.value.trim() || null
  };

  if (!updates.name || !updates.quantity || !updates.category || !updates.added_by) {
    showToast('Rellena todos los campos obligatorios');
    return;
  }

  const { error } = await sb
    .from('products')
    .update(updates)
    .eq('id', editId.value);

  if (error) {
    console.error('Error updating product:', error);
    showToast('Error al guardar cambios');
    return;
  }

  closeEdit();
  showToast('✅ Cambios guardados');
}

// ===== CLEAR =====

async function resetAll() {
  if (!confirm('¿Marcar todos los productos como pendientes?')) return;

  const { error } = await sb
    .from('products')
    .update({ purchased: false })
    .neq('id', '00000000-0000-0000-0000-000000000000');

  if (error) {
    console.error('Error resetting products:', error);
    showToast('Error al reiniciar lista');
  } else {
    showToast('🔄 Lista reiniciada');
  }
  clearDropdown.classList.add('hidden');
}

async function clearPurchased() {
  if (!confirm('¿Borrar todos los productos comprados?')) return;

  const { error } = await sb
    .from('products')
    .delete()
    .eq('purchased', true);

  if (error) {
    console.error('Error clearing purchased:', error);
    showToast('Error al limpiar comprados');
  } else {
    showToast('🗑️ Comprados eliminados');
  }
  clearDropdown.classList.add('hidden');
}

// ===== SUGGESTIONS / HISTORY =====

async function fetchHistory() {
  const { data, error } = await sb
    .from('product_history')
    .select('name')
    .order('last_used', { ascending: false })
    .limit(20);

  if (error) {
    console.error('Error fetching history:', error);
    return;
  }

  productHistory = (data || []).map(h => h.name);

  // Actualizar datalist de sugerencias en el input de nombre
  const datalistId = 'name-suggestions';
  let datalist = document.getElementById(datalistId);
  if (!datalist) {
    datalist = document.createElement('datalist');
    datalist.id = datalistId;
    addName.setAttribute('list', datalistId);
    addName.parentNode.appendChild(datalist);
  }

  datalist.innerHTML = productHistory.map(n => `<option value="${escapeHtml(n)}">`).join('');
}

async function recordToHistory(name) {
  const { error } = await sb
    .from('product_history')
    .upsert({ name: name.toLowerCase().trim(), last_used: new Date().toISOString() });

  if (error) {
    console.error('Error recording history:', error);
  }

  // Actualizar caché local
  if (!productHistory.includes(name)) {
    productHistory.unshift(name);
    productHistory = productHistory.slice(0, 20);
  }
}

// ===== REAL-TIME =====

function subscribeToChanges() {
  sb
    .channel('products-changes')
    .on('postgres_changes',
      { event: '*', schema: 'public', table: 'products' },
      () => { fetchProducts(); }
    )
    .subscribe();
}

// ===== TOAST =====

let toastTimeout;

function showToast(message) {
  toast.textContent = message;
  toast.classList.remove('hidden');

  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.add('hidden');
  }, 2500);
}

// ===== EVENT LISTENERS =====

function bindEvents() {
  // PIN
  pinForm.addEventListener('submit', handlePinSubmit);

  // Add
  addForm.addEventListener('submit', addProduct);

  // Clear dropdown
  clearBtn.addEventListener('click', () => {
    clearDropdown.classList.toggle('hidden');
  });

  clearDropdown.querySelector('[data-action="reset-all"]').addEventListener('click', resetAll);
  clearDropdown.querySelector('[data-action="clear-purchased"]').addEventListener('click', clearPurchased);

  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!clearBtn.contains(e.target) && !clearDropdown.contains(e.target)) {
      clearDropdown.classList.add('hidden');
    }
  });

  // Edit
  editForm.addEventListener('submit', saveEdit);
  editCancel.addEventListener('click', closeEdit);
  editOverlay.addEventListener('click', (e) => {
    if (e.target === editOverlay) closeEdit();
  });

  // Logout
  logoutBtn.addEventListener('click', logout);
}

// ===== INIT =====

async function initApp() {
  listLoading.classList.remove('hidden');
  listEmpty.classList.add('hidden');

  await Promise.all([fetchSettings(), fetchProducts(), fetchHistory()]);

  subscribeToChanges();

  addName.focus();
}

// ===== ARRANQUE =====
document.addEventListener('DOMContentLoaded', () => {
  bindEvents();

  if (isAuthenticated()) {
    showAppScreen();
  } else {
    showPinScreen();
  }
});
