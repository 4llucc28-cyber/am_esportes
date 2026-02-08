import { db, auth, googleProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, collection, getDocs, doc, getDoc, setDoc, updateDoc, increment, onAuthStateChanged, signOut } from './firebase-config.js';

// --- PLUGINS GSAP ---
if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger);
}

// --- CONFIG ---
const WHATSAPP_LOJA = "5511984951595"; 
let currentUser = null;
let currentProduct = null;
let selectedSize = null;
let todosProdutos = [];
let isRegistering = false;
let cartCount = 0; // Simulação de carrinho local

// --- SISTEMA DE TOAST (NOTIFICAÇÕES) ---
window.showToast = (msg, type = 'success') => {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    let icon = type === 'error' ? '<i class="fas fa-exclamation-circle" style="color:red"></i>' : '<i class="fas fa-check-circle" style="color:var(--primary-yellow)"></i>';
    toast.innerHTML = `${icon} <span>${msg}</span>`;
    
    container.appendChild(toast);
    
    // Remove depois de 3 segundos
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.5s forwards';
        setTimeout(() => toast.remove(), 500);
    }, 3000);
};

// --- INIT ---
async function init() {
    await carregarBanner();
    await carregarCategorias();
    await carregarProdutos();
}

async function carregarBanner() {
    try {
        const docSnap = await getDoc(doc(db, "site_config", "hero"));
        if (docSnap.exists() && docSnap.data().img) {
            const heroSection = document.querySelector('.hero');
            if(heroSection) {
                // Mantém o gradiente escuro para leitura do texto
                heroSection.style.backgroundImage = `linear-gradient(to right, rgba(0,0,0,0.9) 30%, rgba(0,0,0,0.2)), url('${docSnap.data().img}')`;
            }
        }
    } catch (e) { console.log("Usando banner padrão"); }
}

async function carregarCategorias() {
    const filterContainer = document.getElementById('dynamic-filters');
    if(!filterContainer) return;
    
    try {
        const snap = await getDocs(collection(db, "categorias"));
        snap.forEach(doc => {
            const c = doc.data();
            const btn = document.createElement('button');
            btn.className = 'filter-btn';
            btn.innerText = c.nome.toUpperCase();
            btn.onclick = (e) => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                const filtrados = todosProdutos.filter(p => p.categoria === c.slug);
                renderizar(filtrados);
            };
            filterContainer.appendChild(btn);
        });
        
        // Botão Todos
        const btnTodos = document.querySelector('[data-filter="todos"]');
        if(btnTodos) {
            btnTodos.onclick = (e) => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                renderizar(todosProdutos);
            };
        }
    } catch(e) { console.log("Erro cats", e); }
}

async function carregarProdutos() {
    const container = document.getElementById('products-container');
    container.innerHTML = '<div style="text-align:center;width:100%;padding:40px;"><i class="fas fa-spinner fa-spin fa-2x" style="color:var(--primary-yellow)"></i></div>';
    
    try {
        const querySnapshot = await getDocs(collection(db, "produtos"));
        todosProdutos = [];
        querySnapshot.forEach((doc) => todosProdutos.push({ id: doc.id, ...doc.data() }));
        renderizar(todosProdutos);
    } catch(e) {
        container.innerHTML = '<p style="text-align:center; color:white;">Erro de conexão. Tente recarregar.</p>';
    }
}

function renderizar(lista) {
    const container = document.getElementById('products-container');
    if(!container) return;
    container.innerHTML = '';
    
    if(lista.length === 0) {
        container.innerHTML = '<p style="text-align:center; width:100%; color:#888;">Nenhum produto encontrado.</p>';
        return;
    }

    lista.forEach((produto, index) => {
        const card = document.createElement('div');
        card.classList.add('product-card');
        
        const catExibicao = produto.categoria ? produto.categoria : 'Esportes';
        // Fallback de imagem robusto
        let capa = Array.isArray(produto.img) && produto.img.length > 0 ? produto.img[0] : (typeof produto.img === 'string' && produto.img ? produto.img : 'https://via.placeholder.com/300?text=Sem+Foto');

        card.innerHTML = `
            <div class="product-image">
                <img src="${capa}" onerror="this.src='https://via.placeholder.com/300?text=Erro+Imagem'">
                <div class="product-overlay">
                    <button class="btn-add-cart" onclick="verProduto('${produto.id}')">VER MAIS</button>
                </div>
            </div>
            <div class="product-info">
                <div class="product-cat">${catExibicao}</div>
                <div class="product-name">${produto.nome}</div>
                <div class="product-price">R$ ${produto.preco.toFixed(2).replace('.', ',')}</div>
            </div>`;
        container.appendChild(card);
    });
    
    // Animação de entrada suave
    if (typeof gsap !== 'undefined') {
        gsap.from(".product-card", { y: 50, opacity: 0, stagger: 0.05, duration: 0.6, ease: "power2.out" });
    }
}

// --- MODAL & AÇÕES ---
window.verProduto = async (id) => {
    currentProduct = todosProdutos.find(p => p.id === id);
    selectedSize = null;

    // Incrementa view sem travar a UI
    updateDoc(doc(db, "produtos", id), { views: increment(1) }).catch(()=>{});

    let images = Array.isArray(currentProduct.img) ? currentProduct.img : [currentProduct.img];
    
    const mainImg = document.getElementById('modal-img');
    mainImg.src = images[0] || 'https://via.placeholder.com/300';
    mainImg.style.opacity = 0;
    setTimeout(() => mainImg.style.opacity = 1, 100); // Fade in simples
    
    const thumbsDiv = document.querySelector('.modal-thumbs');
    thumbsDiv.innerHTML = '';
    
    images.forEach((imgUrl, idx) => {
        if(!imgUrl) return;
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

    document.getElementById('modal-name').innerText = currentProduct.nome;
    document.getElementById('modal-price').innerText = `R$ ${currentProduct.preco.toFixed(2).replace('.', ',')}`;
    
    // Descrição mais rica se vazia
    document.getElementById('modal-desc').innerText = currentProduct.descricao || "Tecnologia Dri-Fit para manter você seco e confortável. Escudo bordado de alta qualidade. Produto ideal para uso casual ou prática esportiva.";

    document.querySelectorAll('.size-btn').forEach(btn => btn.classList.remove('selected'));
    openModal('product-modal');
};

window.selectSize = (el, size) => {
    document.querySelectorAll('.size-btn').forEach(btn => btn.classList.remove('selected'));
    el.classList.add('selected');
    selectedSize = size;
};

// Adicionar ao carrinho "Dummy" (Visual apenas)
window.adicionarAoCarrinhoDummy = () => {
    if (!selectedSize) { showToast("Selecione um tamanho primeiro!", "error"); return; }
    
    cartCount++;
    document.getElementById('cart-count').innerText = cartCount;
    
    // Animação no badge
    const badge = document.querySelector('.badge');
    badge.style.transform = "scale(1.5)";
    setTimeout(() => badge.style.transform = "scale(1)", 200);

    showToast(`Adicionado à sacola! (${selectedSize})`);
    closeModal('product-modal');
};

window.finalizarCompraZap = async () => {
    if (!selectedSize) { showToast("Por favor, escolha um tamanho!", "error"); return; }
    
    let msg = `Olá AM Esportes! Gostaria de comprar:\n\n⚽ *${currentProduct.nome}*\n📏 Tamanho: *${selectedSize}*\n💰 Valor: R$ ${currentProduct.preco.toFixed(2).replace('.', ',')}\n\n`;
    
    if (currentUser) {
        msg += `👤 *Cliente:* ${currentUser.displayName || currentUser.email}\n`;
        // Tenta pegar endereço se tiver salvo (opcional)
        try {
            const uDoc = await getDoc(doc(db, "users", currentUser.uid));
            if(uDoc.exists() && uDoc.data().address) msg += `📍 *Endereço:* ${uDoc.data().address}\n`;
        } catch(e){}
    }
    
    msg += `\nAguardo o link de pagamento!`;
    window.open(`https://wa.me/${WHATSAPP_LOJA}?text=${encodeURIComponent(msg)}`, '_blank');
};

// --- AUTH (Mantido funcional) ---
// --- CONFIGURAÇÃO DO ADMIN ---
const EMAIL_ADMIN = "admin@amesportes.com"; // <--- ESSE É O E-MAIL DO CHEFE

// --- AUTH E CONTROLE DE ACESSO ---
onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    const loginBtn = document.getElementById('nav-login-btn');
    const menuList = document.getElementById('menu-list');

    // Remove botão de admin antigo se existir (pra não duplicar)
    const oldAdmLink = document.getElementById('adm-link');
    if (oldAdmLink) oldAdmLink.remove();

    if (user) {
        // Pega o primeiro nome do usuário
        let nomeDisplay = 'Cliente';
        if (user.displayName) {
            nomeDisplay = user.displayName.split(' ')[0];
        } else if (user.email) {
            nomeDisplay = user.email.split('@')[0];
        }

        // Atualiza o botão do topo (mostra o nome e ícone verde)
        if(loginBtn) {
            loginBtn.innerHTML = `<i class="fas fa-user-check" style="color: #00a650;"></i> <span style="color: var(--primary-yellow); font-weight:bold;">${nomeDisplay}</span>`;
            // Ao clicar, pergunta se quer sair
            loginBtn.onclick = () => {
                if(confirm(`Logado como ${user.email}. Deseja sair?`)) {
                    signOut(auth).then(() => window.location.reload());
                }
            };
        }

        // SE FOR O ADMIN, ADICIONA O BOTÃO NO MENU
        if (user.email === EMAIL_ADMIN) {
            const li = document.createElement('li');
            li.id = 'adm-link';
            // Botão vermelho chamativo
            li.innerHTML = `<a href="admin.html" target="_blank" style="background: #d32f2f; color: white; padding: 5px 15px; border-radius: 4px; border: none;">👑 PAINEL ADM</a>`;
            // Adiciona como primeiro item do menu ou último
            if(menuList) menuList.appendChild(li);
            
            showToast(`Bem-vindo Chefe! Painel liberado.`, "success");
        } else {
            showToast(`Bem-vindo, ${nomeDisplay}!`);
        }

    } else {
        // Se não tiver logado
        if(loginBtn) {
            loginBtn.innerHTML = `<i class="far fa-user"></i> <span>Entrar</span>`;
            loginBtn.onclick = () => openModal('login-modal');
        }
    }
});

// Switch Login/Cadastro
window.toggleAuthMode = () => {
    isRegistering = !isRegistering;
    const nameInput = document.getElementById('auth-name');
    const submitBtn = document.getElementById('btn-auth-submit');
    const toggleText = document.getElementById('auth-toggle-text');

    if (isRegistering) {
        nameInput.classList.remove('hidden'); nameInput.required = true;
        submitBtn.innerText = "CADASTRAR E ENTRAR"; 
        toggleText.innerHTML = "Já tenho conta. <b>Fazer Login</b>";
    } else {
        nameInput.classList.add('hidden'); nameInput.required = false;
        submitBtn.innerText = "ENTRAR"; 
        toggleText.innerHTML = "Não tem conta? <b>Criar conta</b>";
    }
};

const authForm = document.getElementById('auth-form');
if(authForm) {
    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('auth-email').value;
        const pass = document.getElementById('auth-password').value;
        const name = document.getElementById('auth-name').value;
        
        try {
            if (isRegistering) {
                const cred = await createUserWithEmailAndPassword(auth, email, pass);
                if(name) updateProfile(cred.user, { displayName: name });
                showToast("Conta criada com sucesso!");
            } else {
                await signInWithEmailAndPassword(auth, email, pass);
                showToast("Login realizado!");
            }
            closeModal('login-modal');
        } catch (error) { 
            showToast(error.message, "error");
        }
    });
}

// --- UTILITÁRIOS ---
window.openModal = (id) => { document.getElementById(id).style.display = 'flex'; }
window.closeModal = (id) => { document.getElementById(id).style.display = 'none'; }
window.onclick = (e) => { if(e.target.classList.contains('modal-overlay')) e.target.style.display = "none"; }

window.filtrarPorTime = (termo) => {
    // Scroll suave até produtos
    document.getElementById('produtos').scrollIntoView({ behavior: 'smooth' });
    
    // Filtro client-side simples para a demo
    const filtrados = todosProdutos.filter(p => {
        const t = termo.toLowerCase();
        return (p.nome && p.nome.toLowerCase().includes(t)) || 
               (p.time && p.time.toLowerCase().includes(t)) || 
               (p.categoria && p.categoria.toLowerCase().includes(t));
    });
    
    renderizar(filtrados);
    showToast(`Mostrando resultados para: ${termo}`);
};

window.buscarProduto = (val) => {
    if(val.length < 3) { if(val.length === 0) renderizar(todosProdutos); return; }
    const filtrados = todosProdutos.filter(p => p.nome.toLowerCase().includes(val.toLowerCase()) || p.time.toLowerCase().includes(val.toLowerCase()));
    renderizar(filtrados);
};

window.loginGoogle = async () => { 
    try { await signInWithPopup(auth, googleProvider); closeModal('login-modal'); showToast("Bem-vindo!"); } 
    catch(e) { showToast("Erro no Google Login", "error"); } 
};
window.faleConosco = () => window.open(`https://wa.me/${WHATSAPP_LOJA}`, '_blank');

init();