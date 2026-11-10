/* CP3 — Portfólio de Victor dos Santos Costa
   Features: tema claro/escuro (localStorage), formulário com validação
   + histórico de mensagens (localStorage) e gráfico em canvas. */
(function () {
  'use strict';

  /* ---------- helpers de localStorage (à prova de falhas) ---------- */
  function lerStorage(chave, padrao) {
    try {
      const v = localStorage.getItem(chave);
      return v === null ? padrao : JSON.parse(v);
    } catch (e) { return padrao; }
  }
  function gravarStorage(chave, valor) {
    try { localStorage.setItem(chave, JSON.stringify(valor)); } catch (e) { /* ignora */ }
  }

  /* ---------- 1. Tema claro/escuro persistente ---------- */
  function aplicarTema(tema) {
    document.documentElement.setAttribute('data-tema', tema);
    const btn = document.getElementById('botao-tema');
    if (btn) {
      btn.textContent = tema === 'escuro' ? '☀️ Tema claro' : '🌙 Tema escuro';
      btn.setAttribute('aria-pressed', String(tema === 'escuro'));
    }
  }

  function iniciarTema() {
    const nav = document.querySelector('.main-nav ul');
    if (nav) {
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.id = 'botao-tema';
      btn.className = 'botao-tema';
      li.appendChild(btn);
      nav.appendChild(li);
      btn.addEventListener('click', function () {
        const novo = document.documentElement.getAttribute('data-tema') === 'escuro' ? 'claro' : 'escuro';
        gravarStorage('tema', novo);
        aplicarTema(novo);
      });
    }
    aplicarTema(lerStorage('tema', 'claro'));
  }

  /* ---------- 2. Formulário: validação + feedback + histórico ---------- */
  function iniciarFormulario() {
    const form = document.getElementById('form-contato');
    if (!form) return;

    const feedback = document.getElementById('feedback');
    const lista = document.getElementById('lista-mensagens');
    const btnLimpar = document.getElementById('limpar-historico');
    const telefone = form.elements['Telefone'];

    const regras = {
      Nome: function (v) {
        if (v.trim().length < 3) return 'Informe seu nome (mínimo 3 caracteres).';
      },
      Email: function (v) {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim())) return 'Informe um e-mail válido, ex.: nome@dominio.com.';
      },
      Telefone: function (v) {
        if (!/^\(\d{2}\) \d{4,5}-\d{4}$/.test(v)) return 'Use o formato (11) 97356-3037.';
      },
      Assunto: function (v) {
        if (!v) return 'Selecione um assunto.';
      },
      Mensagem: function (v) {
        if (v.trim().length < 10) return 'A mensagem precisa ter pelo menos 10 caracteres.';
      }
    };

    function erroDoCampo(campo) {
      const regra = regras[campo.name];
      return regra ? regra(campo.value) : undefined;
    }

    function mostrarErro(campo, msg) {
      let span = campo.parentNode.querySelector('.erro-campo[data-para="' + campo.name + '"]');
      if (!span) {
        span = document.createElement('span');
        span.className = 'erro-campo';
        span.dataset.para = campo.name;
        span.id = 'erro-' + campo.name;
        campo.insertAdjacentElement('afterend', span);
      }
      span.textContent = msg || '';
      campo.classList.toggle('invalido', !!msg);
      campo.classList.toggle('valido', !msg && campo.value !== '');
      campo.setAttribute('aria-invalid', msg ? 'true' : 'false');
      campo.setAttribute('aria-describedby', span.id);
    }

    function mostrarFeedback(tipo, texto) {
      feedback.hidden = false;
      feedback.className = 'feedback feedback-' + tipo;
      feedback.textContent = texto;
    }

    // máscara de telefone enquanto digita
    telefone.addEventListener('input', function () {
      let d = telefone.value.replace(/\D/g, '').slice(0, 11);
      let out = d;
      if (d.length > 10) out = '(' + d.slice(0, 2) + ') ' + d.slice(2, 7) + '-' + d.slice(7);
      else if (d.length > 6) out = '(' + d.slice(0, 2) + ') ' + d.slice(2, 6) + '-' + d.slice(6);
      else if (d.length > 2) out = '(' + d.slice(0, 2) + ') ' + d.slice(2);
      else if (d.length > 0) out = '(' + d;
      telefone.value = out;
    });

    // validação ao sair do campo e correção em tempo real
    Object.keys(regras).forEach(function (nome) {
      const campo = form.elements[nome];
      campo.addEventListener('blur', function () { mostrarErro(campo, erroDoCampo(campo)); });
      campo.addEventListener('input', function () {
        if (campo.classList.contains('invalido')) mostrarErro(campo, erroDoCampo(campo));
      });
    });

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      let primeiroInvalido = null;
      Object.keys(regras).forEach(function (nome) {
        const campo = form.elements[nome];
        const msg = erroDoCampo(campo);
        mostrarErro(campo, msg);
        if (msg && !primeiroInvalido) primeiroInvalido = campo;
      });

      if (primeiroInvalido) {
        mostrarFeedback('erro', 'Corrija os campos destacados e tente novamente.');
        primeiroInvalido.focus();
        return;
      }

      const msgs = lerStorage('mensagens', []);
      msgs.unshift({
        nome: form.elements['Nome'].value.trim(),
        email: form.elements['Email'].value.trim(),
        assunto: form.elements['Assunto'].value,
        preferencia: form.elements['Preferencia'].value,
        mensagem: form.elements['Mensagem'].value.trim(),
        data: new Date().toLocaleString('pt-BR')
      });
      gravarStorage('mensagens', msgs);

      mostrarFeedback('sucesso', 'Mensagem enviada com sucesso! Obrigado, ' + msgs[0].nome.split(' ')[0] + '.');
      form.reset();
      Object.keys(regras).forEach(function (nome) {
        const c = form.elements[nome];
        c.classList.remove('valido', 'invalido');
        const sp = c.parentNode.querySelector('.erro-campo[data-para="' + nome + '"]');
        if (sp) sp.textContent = '';
      });
      renderizarHistorico();
    });

    function renderizarHistorico() {
      const msgs = lerStorage('mensagens', []);
      lista.innerHTML = '';
      if (!msgs.length) {
        const li = document.createElement('li');
        li.className = 'vazio';
        li.textContent = 'Nenhuma mensagem enviada ainda.';
        lista.appendChild(li);
      }
      msgs.forEach(function (m, i) {
        const li = document.createElement('li');
        const topo = document.createElement('strong');
        topo.textContent = m.assunto + ' — ' + m.nome;
        const meta = document.createElement('small');
        meta.textContent = m.data + ' · contato preferido: ' + m.preferencia;
        const corpo = document.createElement('p');
        corpo.textContent = m.mensagem;
        const rm = document.createElement('button');
        rm.type = 'button';
        rm.className = 'remover';
        rm.textContent = 'Remover';
        rm.addEventListener('click', function () {
          const atual = lerStorage('mensagens', []);
          atual.splice(i, 1);
          gravarStorage('mensagens', atual);
          renderizarHistorico();
        });
        li.append(topo, meta, corpo, rm);
        lista.appendChild(li);
      });
      btnLimpar.hidden = !msgs.length;
    }

    btnLimpar.addEventListener('click', function () {
      gravarStorage('mensagens', []);
      renderizarHistorico();
    });

    renderizarHistorico();
  }

  /* ---------- 3. Gráfico de barras (canvas) ---------- */
  function iniciarGrafico() {
    const canvas = document.getElementById('skillsCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const escuro = document.documentElement.getAttribute('data-tema') === 'escuro';

    const skills = [
      { nome: 'Gráfico de ex 1', nivel: 70 },
      { nome: 'Gráfico de ex 2', nivel: 60 },
      { nome: 'Gráfico de ex 3', nivel: 65 },
      { nome: 'Gráfico de ex 4', nivel: 40 }
    ];
    const larguraBarra = 70, espaco = 40, alturaMax = 180, baseY = 220;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = '14px system-ui, sans-serif';
    skills.forEach(function (skill, i) {
      const x = espaco + i * (larguraBarra + espaco);
      const h = (skill.nivel / 100) * alturaMax;
      const y = baseY - h;
      ctx.fillStyle = '#3498db';
      ctx.fillRect(x, y, larguraBarra, h);
      ctx.fillStyle = escuro ? '#e6edf3' : '#333';
      ctx.textAlign = 'center';
      ctx.fillText(skill.nivel + '%', x + larguraBarra / 2, y - 8);
    });
    ctx.strokeStyle = '#999';
    ctx.beginPath();
    ctx.moveTo(20, baseY);
    ctx.lineTo(480, baseY);
    ctx.stroke();
  }

  document.addEventListener('DOMContentLoaded', function () {
    iniciarTema();
    iniciarFormulario();
    iniciarGrafico();
    const btn = document.getElementById('botao-tema');
    if (btn) btn.addEventListener('click', iniciarGrafico);
  });
})();
