import { db, auth, googleProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, collection, getDocs, doc, getDoc, setDoc, updateDoc, increment, onAuthStateChanged, signOut } from './firebase-config.js';

// Registra plugins se existirem (evita erro se o script demorar a carregar)
if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger);
}

// --- CONFIGURAÇÃO ---
const EMAIL_ADMIN = "admin@amesportes.com"; 
const WHATSAPP_LOJA = "5511984951595"; 

// --- VARIÁVEIS GLOBAIS (O erro estava aqui, elas precisam existir!) ---
let currentUser = null;
let currentProduct = null;
let selectedSize = null;
let todosProdutos = [];
let isRegistering = false; // <--- AQUI ESTAVA O ERRO "NOT DEFINED"

// --- 1. INICIALIZAÇÃO ---
async function init() {
    await carregarBanner();
    await carregarCategorias();
    await carregarProdutos();
}

// Carregar Banner do Admin
async function carregarBanner() {
    try {
        const docRef = doc(db, "site_config", "hero");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().img) {
            const heroSection = document.querySelector('.hero');
            if(heroSection) {
                heroSection.style.backgroundImage = `linear-gradient(to right, rgba(0,0,0,0.9) 30%, rgba(0,0,0,0.2)), url('${docSnap.data().img}')`;
            }
        }
    } catch (e) { console.log("Banner padrão mantido"); }
}

async function carregarCategorias() {
    const filterContainer = document.getElementById('dynamic-filters');
    if(!filterContainer) return;
    
    filterContainer.innerHTML = '<button class="filter-btn active" data-filter="todos">TODOS</button>';
    try {
        const snap = await getDocs(collection(db, "categorias"));
        snap.forEach(doc => {
            const c = doc.data();
            const btn = document.createElement('button');
            btn.className = 'filter-btn';
            btn.innerText = c.nome.toUpperCase();
            btn.onclick = () => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const filtrados = todosProdutos.filter(p => p.categoria === c.slug);
                renderizar(filtrados);
            };
            filterContainer.appendChild(btn);
        });
        
        const btnTodos = filterContainer.querySelector('[data-filter="todos"]');
        if(btnTodos) {
            btnTodos.onclick = (e) => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                renderizar(todosProdutos);
            };
        }
    } catch(e) { console.log("Erro ao carregar categorias"); }
}

async function carregarProdutos() {
    const container = document.getElementById('products-container');
    if(!container) return;
    
    container.innerHTML = '<p style="text-align:center; width:100%">Carregando...</p>';
    try {
        const querySnapshot = await getDocs(collection(db, "produtos"));
        todosProdutos = [];
        querySnapshot.forEach((doc) => todosProdutos.push({ id: doc.id, ...doc.data() }));
        renderizar(todosProdutos);
    } catch(e) {
        container.innerHTML = '<p style="text-align:center;">Erro ao carregar produtos. Verifique sua conexão.</p>';
    }
}

function renderizar(lista) {
    const container = document.getElementById('products-container');
    if(!container) return;
    container.innerHTML = '';
    
    if(lista.length === 0) {
        container.innerHTML = '<p style="text-align:center; width:100%">Nenhum produto encontrado.</p>';
        return;
    }

    lista.forEach(produto => {
        const card = document.createElement('div');
        card.classList.add('product-card');
        
        // CORREÇÃO UNDEFINED: Se não tiver categoria, usa "Esportes"
        const catExibicao = produto.categoria ? produto.categoria : 'Esportes';
        // CORREÇÃO IMAGEM: Pega a primeira do array ou a string antiga
        const capa = Array.isArray(produto.img) ? produto.img[0] : produto.img;

        card.innerHTML = `
            <div class="product-image">
                <img src="${capa}" onerror="this.src='https://via.placeholder.com/300'">
                <div class="product-overlay">
                    <button class="btn-add-cart" onclick="verProduto('${produto.id}')">VER DETALHES</button>
                </div>
            </div>
            <div class="product-info">
                <div class="product-cat">${catExibicao}</div>
                <div class="product-name">${produto.nome}</div>
                <div class="product-price">R$ ${produto.preco.toFixed(2).replace('.', ',')}</div>
            </div>`;
        container.appendChild(card);
    });
    
    if (typeof gsap !== 'undefined') {
        gsap.from(".product-card", { y: 30, opacity: 0, stagger: 0.1 });
    }
}

// --- MODAL DE PRODUTO ---
window.verProduto = async (id) => {
    currentProduct = todosProdutos.find(p => p.id === id);
    selectedSize = null;

    try { await updateDoc(doc(db, "produtos", id), { views: increment(1) }); } catch (e) {}

    let images = Array.isArray(currentProduct.img) ? currentProduct.img : [currentProduct.img];
    
    document.getElementById('modal-img').src = images[0];
    
    const thumbsDiv = document.querySelector('.modal-thumbs');
    if(thumbsDiv) {
        thumbsDiv.innerHTML = '';
        images.forEach((imgUrl, idx) => {
            const thumb = document.createElement('img');
            thumb.src = imgUrl;
            thumb.className = idx === 0 ? 'thumb-item active' : 'thumb-item';
            thumb.onclick = () => {
                document.getElementById('modal-img').src = imgUrl;
                document.querySelectorAll('.thumb-item').forEach(t => t.classList.remove('active'));
                thumb.classList.add('active');
            };
            thumbsDiv.appendChild(thumb);
        });
    }

    document.getElementById('modal-name').innerText = currentProduct.nome;
    document.getElementById('modal-price').innerText = `R$ ${currentProduct.preco.toFixed(2).replace('.', ',')}`;
    
    const viewsEl = document.getElementById('modal-views');
    if(viewsEl) viewsEl.innerText = (currentProduct.views || 0) + 1;
    
    const descEl = document.getElementById('modal-desc');
    if(descEl) descEl.innerText = currentProduct.descricao || "Produto oficial com garantia de qualidade.";

    document.querySelectorAll('.size-btn').forEach(btn => btn.classList.remove('selected'));
    openModal('product-modal');
};

window.selectSize = (el, size) => {
    document.querySelectorAll('.size-btn').forEach(btn => btn.classList.remove('selected'));
    el.classList.add('selected');
    selectedSize = size;
};

window.finalizarCompraZap = async () => {
    if (!selectedSize) { alert("Escolha um tamanho! 👕"); return; }
    let msg = `Olá! Quero a camisa: *${currentProduct.nome}* \n📏 Tamanho: *${selectedSize}* \n💰 R$ ${currentProduct.preco.toFixed(2).replace('.', ',')} \n\n`;
    if (currentUser) {
        const docSnap = await getDoc(doc(db, "users", currentUser.uid));
        if (docSnap.exists() && docSnap.data().address) {
            msg += `📍 *Entrega:* \nNome: ${currentUser.displayName || 'Cliente'} \nEndereço: ${docSnap.data().address}`;
        } else {
            msg += `📍 *Entrega:* \nNome: ${currentUser.displayName || 'Cliente'} \n(Endereço não cadastrado)`;
        }
    }
    window.open(`https://wa.me/${WHATSAPP_LOJA}?text=${encodeURIComponent(msg)}`, '_blank');
};

// --- AUTENTICAÇÃO ---
onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    const loginBtn = document.getElementById('nav-login-btn');
    const menuList = document.getElementById('menu-list');

    if (user) {
        // CORREÇÃO DO NOME UNDEFINED NO MENU
        let nomeDisplay = 'Cliente';
        if (user.displayName) {
            nomeDisplay = user.displayName.split(' ')[0];
        } else if (user.email) {
            nomeDisplay = user.email.split('@')[0];
        }

        if(loginBtn) {
            loginBtn.innerHTML = `<i class="fas fa-user-circle"></i> <span>${nomeDisplay}</span>`;
            loginBtn.onclick = () => openModal('profile-modal');
        }
        
        if (user.email === EMAIL_ADMIN && !document.getElementById('adm-link')) {
            const li = document.createElement('li');
            li.id = 'adm-link';
            li.innerHTML = `<a href="admin.html" target="_blank" style="color: #d32f2f; border: 1px solid #d32f2f; padding: 5px 10px; border-radius: 4px;">PAINEL ADM</a>`;
            if(menuList) menuList.appendChild(li);
        }
    } else {
        if(loginBtn) {
            loginBtn.innerHTML = `<i class="far fa-user"></i> <span>Entrar</span>`;
            loginBtn.onclick = () => openModal('login-modal');
        }
    }
});

// Essa função agora existe e o erro vai sumir
window.toggleAuthMode = () => {
    isRegistering = !isRegistering;
    const nameInput = document.getElementById('auth-name');
    const submitBtn = document.getElementById('btn-auth-submit');
    const toggleText = document.getElementById('auth-toggle-text');
    
    if(!nameInput || !submitBtn || !toggleText) return;

    if (isRegistering) {
        nameInput.classList.remove('hidden'); 
        nameInput.required = true;
        submitBtn.innerText = "CADASTRAR"; 
        toggleText.innerHTML = "Já tem conta? <b>Faça Login</b>";
    } else {
        nameInput.classList.add('hidden'); 
        nameInput.required = false;
        submitBtn.innerText = "ENTRAR"; 
        toggleText.innerHTML = "Não tem conta? <b>Cadastre-se aqui</b>";
    }
};

const authForm = document.getElementById('auth-form');
if(authForm) {
    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('auth-email').value;
        const password = document.getElementById('auth-password').value;
        const nameInput = document.getElementById('auth-name');
        
        try {
            if (isRegistering) {
                const cred = await createUserWithEmailAndPassword(auth, email, password);
                if(nameInput && nameInput.value) {
                    await updateProfile(cred.user, { displayName: nameInput.value });
                }
                alert("Conta criada com sucesso!");
            } else {
                await signInWithEmailAndPassword(auth, email, password);
            }
            closeModal('login-modal');
            window.location.reload();
        } catch (error) { 
            let msg = error.message;
            if(msg.includes("auth/operation-not-allowed")) msg = "Habilite E-mail/Senha no console do Firebase!";
            alert("Erro: " + msg); 
        }
    });
}

// --- UTILITÁRIOS ---
window.openModal = (id) => { const el = document.getElementById(id); if(el) el.style.display = 'flex'; }
window.closeModal = (id) => { const el = document.getElementById(id); if(el) el.style.display = 'none'; }
window.onclick = (e) => { if(e.target.classList.contains('modal-overlay')) e.target.style.display = "none"; }
window.logout = async () => { await signOut(auth); location.reload(); }
window.loginGoogle = async () => { try { await signInWithPopup(auth, googleProvider); closeModal('login-modal'); } catch(e) { alert(e.message); } };
window.filtrarPorTime = (nome) => {
    const prodSec = document.getElementById('produtos');
    if(prodSec) prodSec.scrollIntoView({ behavior: 'smooth' });
    renderizar(todosProdutos.filter(p => p.time && p.time.toLowerCase().includes(nome.toLowerCase())));
};
window.filtrarLancamentos = () => {
    const prodSec = document.getElementById('produtos');
    if(prodSec) prodSec.scrollIntoView({ behavior: 'smooth' });
    const destaques = todosProdutos.filter(p => p.destaque === true);
    renderizar(destaques);
    const header = document.querySelector('.section-header h2');
    if(header) header.innerHTML = `CONFIRA OS <span style="color:var(--primary-yellow)">LANÇAMENTOS</span>`;
};
window.rastrearPedido = () => {
    const codigo = prompt("Digite seu código de rastreio ou CPF:");
    if(codigo) window.open(`https://wa.me/${WHATSAPP_LOJA}?text=Rastreio: ${codigo}`, '_blank');
};
window.faleConosco = () => window.open(`https://wa.me/${WHATSAPP_LOJA}`, '_blank');

init();