const fontes = [
  { nome: "Olhar Digital", rss: "https://olhardigital.com.br/feed/" },
  { nome: "Canaltech", rss: "https://feeds.feedburner.com/canaltechbr" },
  { nome: "TechTudo", rss: "https://feeds.feedburner.com/techtudo" },
  { nome: "TecMundo", rss: "https://feeds.feedburner.com/tecmundo" },
  { nome: "Tecnoblog", rss: "https://feeds.feedburner.com/tecnoblog" },
  { nome: "Gizmodo Brasil", rss: "https://gizmodo.uol.com.br/feed/" }
];

let allNoticias = [];
let paginaAtual = 0;
const porPagina = 3;
const maxTentativas = 3;
const loadingOverlay = document.getElementById('loading-overlay');

async function fetchFeed(site, tentativas = 1) {
  try {
    const url = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(site.rss)}`;
    const response = await fetch(url);
    const data = await response.json();
    if (!data.items || data.items.length === 0) throw new Error("Nenhuma notícia encontrada");

    return data.items.filter(item => {
      const imagem = item.enclosure?.link || item.thumbnail || null;
      const descricao = item.description?.replace(/<[^>]+>/g, "").trim();
      return imagem && descricao;
    }).map(item => ({
      site: site.nome,
      titulo: item.title,
      link: item.link,
      descricao: item.description.replace(/<[^>]+>/g, "").substring(0,150) + "...",
      imagem: item.enclosure?.link || item.thumbnail
    }));

  } catch (err) {
    console.warn(`Erro ao carregar ${site.nome} (tentativa ${tentativas}):`, err.message);
    if (tentativas < maxTentativas) {
      await new Promise(r => setTimeout(r, 1500));
      return fetchFeed(site, tentativas + 1);
    } else {
      console.error(`Falha ao carregar ${site.nome} após ${maxTentativas} tentativas.`);
      return [];
    }
  }
}

function carregarMaisNoticias() {
  const feed = document.getElementById('feed-principal');
  const inicio = paginaAtual * porPagina;
  const fim = inicio + porPagina;
  const noticiasParaMostrar = allNoticias.slice(inicio, fim);

  noticiasParaMostrar.forEach(noticia => {
    if(!noticia.imagem || !noticia.descricao) return;

    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <a href="${noticia.link}" target="_blank">
        <img src="${noticia.imagem}" alt="${noticia.site}">
        <h4>${noticia.titulo}</h4>
        <p>${noticia.descricao}</p>
      </a>
    `;
    feed.appendChild(card);
    setTimeout(() => card.classList.add('visible'), 100);
  });

  paginaAtual++;
}

async function fetchNoticias() {
  loadingOverlay.style.display = "flex";

  const stored = localStorage.getItem('noticias');
  if(stored){
    allNoticias = JSON.parse(stored);
    mostrarNoticiasInstantaneamente();
  }

  paginaAtual = 0;
  const destaque = document.getElementById('destaque');
  destaque.innerHTML = "<p>Atualizando conteúdos...</p>";

  let todasNoticias = [];
  for(const site of fontes){
    const noticias = await fetchFeed(site);
    todasNoticias.push(...noticias);
  }

  allNoticias = todasNoticias.filter((v,i,a)=>a.findIndex(t=>(t.titulo===v.titulo))===i);
  localStorage.setItem('noticias', JSON.stringify(allNoticias));

  destaque.innerHTML = "";
  fontes.forEach(site => {
    const noticia = allNoticias.find(n => n.site === site.nome);
    if(noticia){
      const div = document.createElement('div');
      div.className = 'destaque-item';
      div.innerHTML = `
        <a href="${noticia.link}" target="_blank">
          <img src="${noticia.imagem}" alt="${site.nome}">
          <h3>${site.nome}</h3>
          <p>${noticia.descricao}</p>
        </a>
      `;
      destaque.appendChild(div);
    }
  });

  loadingOverlay.style.display = "none";
  carregarMaisNoticias();
}

function mostrarNoticiasInstantaneamente(){
  const feed = document.getElementById('feed-principal');
  feed.innerHTML = "";
  paginaAtual = 0;
  carregarMaisNoticias();
}

window.addEventListener('scroll', () => {
  if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 200) {
    carregarMaisNoticias();
  }
});

fetchNoticias();
setInterval(fetchNoticias, 86400000);
