// SUPABASE CONFIGURATION
const SUPABASE_URL = "https://gvtquivrqcjfjfhmmbgn.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2dHF1aXZycWNqZmpmaG1tYmduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzMjY5MzMsImV4cCI6MjA5NzkwMjkzM30.jDFA09L24SzTlPm9JlDFhuIIBOso_61QpjTSPkt-0vY";
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
// State Management
let allProducts = [];
let cart = [];

// Initialize Website
document.addEventListener('DOMContentLoaded', () => {
    fetchProducts();
});

// --- PRODUCT FETCHING ---
async function fetchProducts() {
    const { data, error } = await supabaseClient
        .from('products')
        .select('*')
        .order('id', { ascending: false });

    if (error) {
        console.error("Error fetching products:", error.message);
    } else {
        allProducts = data;
        renderProducts(allProducts);
        renderAdminInventory(allProducts);
    }
}

function renderProducts(products) {
    const grid = document.getElementById('product-grid');
    grid.innerHTML = '';

    products.forEach(product => {
        grid.innerHTML += `
            <div class="product-card">
                <img src="${product.image_url}" alt="${product.name}">
                <div class="product-info">
                    <h3>${product.name}</h3>
                    <p class="category-tag">${product.category}</p>
                    <p class="price-tag">QAR ${product.price.toFixed(2)}</p>
                    
                    <div class="qty-selector">
                        <button onclick="changeLocalQty('${product.id}', -1)">-</button>
                        <input type="number" id="qty-${product.id}" value="1" min="1">
                        <button onclick="changeLocalQty('${product.id}', 1)">+</button>
                    </div>

                    <button class="add-to-cart-btn" onclick="addToCart('${product.id}')">
                        <i class="fas fa-shopping-cart"></i> Add to Cart
                    </button>
                </div>
            </div>
        `;
    });
}

// Helper for UI quantity input
function changeLocalQty(id, delta) {
    const input = document.getElementById(`qty-${id}`);
    let val = parseInt(input.value) + delta;
    if (val < 1) val = 1;
    input.value = val;
}

// --- CART LOGIC ---
function addToCart(id) {
    const product = allProducts.find(p => p.id == id);
    const qtyInput = document.getElementById(`qty-${id}`);
    const quantity = parseInt(qtyInput.value);

    const existingItem = cart.find(item => item.id == id);

    if (existingItem) {
        existingItem.qty += quantity;
    } else {
        cart.push({ ...product, qty: quantity });
    }

    qtyInput.value = 1; // Reset input
    updateCartUI();
}

function updateCartUI() {
    const list = document.getElementById('cart-items-list');
    const countDisplay = document.getElementById('cart-count');
    const totalDisplay = document.getElementById('cart-total');

    list.innerHTML = '';
    let total = 0;
    let count = 0;

    cart.forEach((item, index) => {
        const itemTotal = item.price * item.qty;
        total += itemTotal;
        count += item.qty;

        list.innerHTML += `
            <div class="cart-item">
                <img src="${item.image_url}" width="50">
                <div class="cart-item-details">
                    <h4>${item.name}</h4>
                    <p>QAR ${item.price} x ${item.qty}</p>
                </div>
                <div class="cart-item-price">QAR ${itemTotal.toFixed(2)}</div>
                <button class="remove-item" onclick="removeFromCart(${index})">&times;</button>
            </div>
        `;
    });

    countDisplay.innerText = count;
    totalDisplay.innerText = total.toFixed(2);
}

function removeFromCart(index) {
    cart.splice(index, 1);
    updateCartUI();
}

// --- ADMIN FUNCTIONS ---
async function uploadProduct() {
    const name = document.getElementById('prodName').value;
    const price = parseFloat(document.getElementById('prodPrice').value);
    const category = document.getElementById('prodCategory').value;
    const imageFile = document.getElementById('prodImage').files[0];

    if (!name || !price || !imageFile) {
        alert("Please provide name, price, and image");
        return;
    }

    // 1. Upload Image to Storage Bucket
    const fileName = `${Date.now()}_${imageFile.name}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(fileName, imageFile);

    if (uploadError) {
        alert("Upload Error: " + uploadError.message);
        return;
    }

    // 2. Get Public URL
    const { data: urlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(fileName);
    
    const image_url = urlData.publicUrl;

    // 3. Insert into Table
    const { error: insertError } = await supabase
        .from('products')
        .insert([{ name, price, category, image_url }]);

    if (insertError) {
        alert("Database Error: " + insertError.message);
    } else {
        alert("Product added successfully!");
        document.getElementById('prodName').value = '';
        document.getElementById('prodPrice').value = '';
        document.getElementById('prodImage').value = '';
        fetchProducts();
    }
}

function renderAdminInventory(products) {
    const list = document.getElementById('admin-inventory-list');
    list.innerHTML = '';
    products.forEach(p => {
        list.innerHTML += `
            <div class="admin-item-row">
                <span>${p.name} (QAR ${p.price})</span>
                <button onclick="deleteProduct('${p.id}')">Delete</button>
            </div>
        `;
    });
}

async function deleteProduct(id) {
    if (confirm("Are you sure you want to delete this product?")) {
        const { error } = await supabase.from('products').delete().eq('id', id);
        if (error) alert(error.message);
        else fetchProducts();
    }
}

// --- UI TOGGLES ---
function toggleCart() {
    const sidebar = document.getElementById('cart-sidebar');
    sidebar.classList.toggle('active');
}

function toggleAdmin() {
    const modal = document.getElementById('admin-modal');
    modal.style.display = 'block';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// Window click to close modals
window.onclick = function(event) {
    const adminModal = document.getElementById('admin-modal');
    if (event.target == adminModal) {
        adminModal.style.display = "none";
    }
}