// Dados
let atletas = JSON.parse(localStorage.getItem('atletas_futebol')) || [];
let mensalidades = JSON.parse(localStorage.getItem('registros_mensalidade')) || [];

// === FUNÇÕES DE ATLETAS ===

function salvarAtleta() {
    const id = document.getElementById('atletaId').value;
    const nome = document.getElementById('nome').value;
    const telefone = document.getElementById('telefone').value;
    const posicao = document.getElementById('posicao').value;

    if (!nome) return alert("Digite o nome do atleta");

    const atletaDado = {
        id: id ? parseInt(id) : Date.now(),
        nome,
        telefone,
        posicao
    };

    if (id) {
        const index = atletas.findIndex(a => a.id === parseInt(id));
        atletas[index] = atletaDado;
    } else {
        atletas.push(atletaDado);
    }

    localStorage.setItem('atletas_futebol', JSON.stringify(atletas));
    renderizar();
    limpar();
}

function renderizar() {
    const lista = document.getElementById('listaAtletas');
    if (lista) {
        lista.innerHTML = '';
        if (atletas.length === 0) lista.innerHTML = '<p>Nenhum atleta registado.</p>';

        atletas.forEach(a => {
            lista.innerHTML += `
            <div class="atleta-item">
                <strong>${a.nome}</strong> <span style="background:#eee; padding: 2px 5px; border-radius: 4px; font-size: 0.8rem;">${a.posicao}</span><br>
                <small>Tel: ${a.telefone || 'Não informado'}</small>
                <div class="acoes">
                    <button class="btn-zap" onclick="enviarZap('${a.nome}', '${a.telefone}')">WhatsApp</button>
                    <button class="btn-edit" onclick="editar('${a.id}')">Editar</button>
                    <button class="btn-del" onclick="excluir('${a.id}')">X</button>
                </div>
            </div>
        `;
        });
    }
}

function editar(id) {
    const a = atletas.find(atleta => atleta.id == id); // Loose safe
    if (!a) return;
    document.getElementById('atletaId').value = a.id;
    document.getElementById('nome').value = a.nome;
    document.getElementById('telefone').value = a.telefone || '';
    document.getElementById('posicao').value = a.posicao || 'Goleiro';

    document.getElementById('form-title').innerText = "Editando: " + a.nome;
    document.getElementById('btnSalvar').innerText = "Atualizar Cadastro";
    showView('atletas');
    window.scrollTo(0, 0);
}

function enviarZap(nome, telefone) {
    let msg = `Olá ${nome}, tudo bem? Aqui é do Tottenham FC GO. Passando para informar que a mensalidade do mês de Fevereiro já está disponível para pagamento.`;
    let phoneNum = telefone ? telefone.replace(/\D/g, '') : '';
    if (phoneNum) {
        if (!phoneNum.startsWith('55') && phoneNum.length >= 10) {
            phoneNum = '55' + phoneNum;
        }
        window.open(`https://wa.me/${phoneNum}?text=${encodeURIComponent(msg)}`, '_blank');
    } else {
        alert("Telefone não cadastrado para este atleta.");
    }
}

function excluir(id) {
    if (confirm("Deseja mesmo excluir este registro?")) {
        // Use loose inequality (!=) to handle string/number mismatch from HTML attribute
        atletas = atletas.filter(a => a.id != id);
        localStorage.setItem('atletas_futebol', JSON.stringify(atletas));

        // Remove financial records for this athlete
        mensalidades = mensalidades.filter(m => m.atletaId != id);
        localStorage.setItem('registros_mensalidade', JSON.stringify(mensalidades));

        // Double check for orphans
        limparOrfaosFinanceiros();

        renderizar();
        renderizarFinanceiro(); // Update financial dashboard immediately
    }
}

// Função fazerBackup removida aqui pois já existe uma versão completa mais abaixo no código

function limpar() {
    document.getElementById('atletaId').value = '';
    document.getElementById('nome').value = '';
    document.getElementById('telefone').value = '';
    document.getElementById('posicao').value = 'Goleiro';
    document.getElementById('form-title').innerText = "Registar Atleta";
    document.getElementById('btnSalvar').innerText = "Salvar Registro";
}

function limparOrfaosFinanceiros() {
    // Remove registros financeiros que não tem dono (atleta excluído incorretamente no passado)
    const totalAntes = mensalidades.length;
    const idsExistentes = new Set(atletas.map(a => parseInt(a.id))); // IDs validos

    mensalidades = mensalidades.filter(m => idsExistentes.has(parseInt(m.atletaId)));

    if (mensalidades.length !== totalAntes) {
        console.warn(`Limpeza: ${totalAntes - mensalidades.length} registros orfãos removidos.`);
        localStorage.setItem('registros_mensalidade', JSON.stringify(mensalidades));
        renderizarFinanceiro(); // Atualiza tela se mudou algo
    }
}

// === LÓGICA DE MENSALISTAS ===

function carregarMensalistas() {
    const mesReferencia = document.getElementById('mesReferencia').value;
    if (!mesReferencia) return;

    const tbody = document.getElementById('tabelaMensalistas');
    tbody.innerHTML = '';

    atletas.forEach(atleta => {
        const registroMes = mensalidades.find(m => m.atletaId == atleta.id && m.mesAno === mesReferencia) || {};

        let saldoAteMomento = 0;
        let isGoleiro = (atleta.posicao === 'Goleiro');

        if (!isGoleiro) {
            saldoAteMomento = calcularSaldoAteMes(atleta.id, mesReferencia);
        }

        const tr = document.createElement('tr');
        tr.style.borderBottom = "1px solid #eee";

        let corSaldo = saldoAteMomento >= 0 ? "green" : "red";
        if (isGoleiro) corSaldo = "blue"; // Color for Isento

        let valStr = registroMes.valor !== undefined ? registroMes.valor : '';
        let jogosStr = registroMes.jogos !== undefined ? registroMes.jogos : '';
        let dataStr = registroMes.dataPagto || '';

        // Determine if inputs should be disabled (Goleiro is always disabled for fee)
        let disabledAttr = isGoleiro ? 'disabled style="background-color: #f0f0f0;"' : 'disabled';
        let valPlaceholder = isGoleiro ? 'Isento' : '0,00';
        let saldoDisplay = isGoleiro ? 'ISENTO' : `R$ ${saldoAteMomento.toFixed(2)}`;

        tr.innerHTML = `
            <td>${atleta.nome} <br><small style="color:gray">${atleta.posicao}</small></td>
            <td style="text-align: center;">
                <input type="number" step="0.01" id="valor_${atleta.id}" value="${valStr}" placeholder="${valPlaceholder}" ${disabledAttr} oninput="atualizarSaldoLive(${atleta.id})">
            </td>
            <td style="text-align: center;">
                <input type="date" id="data_${atleta.id}" value="${dataStr}" ${disabledAttr}>
            </td>
            <td style="text-align: center;">
                <input type="number" id="jogos_${atleta.id}" value="${jogosStr}" placeholder="0" ${disabledAttr} oninput="atualizarSaldoLive(${atleta.id})">
            </td>
            <td style="text-align: center; font-weight: bold; color: ${corSaldo};">
                <span id="saldo_${atleta.id}">${saldoDisplay}</span>
            </td>
            <td style="text-align: center; white-space: nowrap;">
                ${isGoleiro ? '<span style="font-size:0.8rem; color:#888;">N/A</span>' : `
                <div id="actions_view_${atleta.id}" style="display: inline-block;">
                    <button onclick="habilitarEdicao(${atleta.id})" class="btn-grid-edit">Editar</button>
                    <button onclick="excluirMensalidade(${atleta.id})" class="btn-grid-del">Excluir</button>
                </div>
                <div id="actions_save_${atleta.id}" style="display: none;">
                    <button onclick="salvarMensalidade(${atleta.id})" class="btn-grid-save">Salvar</button>
                </div>
                `} 
            </td>
        `;

        tbody.appendChild(tr);
    });
}

function habilitarEdicao(atletaId) {
    document.getElementById(`valor_${atletaId}`).disabled = false;
    document.getElementById(`data_${atletaId}`).disabled = false;
    document.getElementById(`jogos_${atletaId}`).disabled = false;

    document.getElementById(`actions_view_${atletaId}`).style.display = 'none';
    document.getElementById(`actions_save_${atletaId}`).style.display = 'inline-block';
}

function calcularSaldoAteMes(atletaId, mesLimite) {
    const atleta = atletas.find(a => a.id == atletaId);
    if (atleta && atleta.posicao === 'Goleiro') return 0;

    // Filter for all transactions less than or equal to the selected month
    const historico = mensalidades.filter(m => m.atletaId == atletaId && m.mesAno <= mesLimite);

    let totalPago = 0;
    let totalCustoJogos = 0;

    historico.forEach(reg => {
        let v = parseFloat(reg.valor);
        if (isNaN(v)) v = 0;
        let j = parseInt(reg.jogos);
        if (isNaN(j)) j = 0;
        totalPago += v;
        totalCustoJogos += j * 25;
    });

    return totalPago - totalCustoJogos;
}

function atualizarSaldoLive(atletaId) {
    const mesReferencia = document.getElementById('mesReferencia').value;

    let valRaw = document.getElementById(`valor_${atletaId}`).value;
    if (valRaw && typeof valRaw === 'string') valRaw = valRaw.replace(',', '.');
    let valorAtual = parseFloat(valRaw) || 0;

    let jogosAtual = parseInt(document.getElementById(`jogos_${atletaId}`).value) || 0;

    // Calculate balance ONLY from previous months (strictly less than current month)
    const historicoAnterior = mensalidades.filter(m => m.atletaId == atletaId && m.mesAno < mesReferencia);

    let saldoAnterior = 0;
    historicoAnterior.forEach(reg => {
        let v = parseFloat(reg.valor) || 0;
        let j = parseInt(reg.jogos) || 0;
        saldoAnterior += v - (j * 25);
    });

    let saldoNovo = saldoAnterior + valorAtual - (jogosAtual * 25);

    const spanSaldo = document.getElementById(`saldo_${atletaId}`);
    if (spanSaldo) {
        spanSaldo.innerText = `R$ ${saldoNovo.toFixed(2)}`;
        spanSaldo.style.color = saldoNovo >= 0 ? "green" : "red";
    }
}

function salvarMensalidade(atletaId) {
    const mesReferencia = document.getElementById('mesReferencia').value;

    let valElem = document.getElementById(`valor_${atletaId}`);
    let valRaw = valElem.value;
    if (valRaw && typeof valRaw === 'string') valRaw = valRaw.replace(',', '.');
    let valor = parseFloat(valRaw);
    if (isNaN(valor)) valor = 0;

    let jogos = parseInt(document.getElementById(`jogos_${atletaId}`).value) || 0;
    let dataPagto = document.getElementById(`data_${atletaId}`).value;

    const index = mensalidades.findIndex(m => m.atletaId == atletaId && m.mesAno === mesReferencia);

    const novoRegistro = {
        atletaId: parseInt(atletaId),
        mesAno: mesReferencia,
        valor,
        dataPagto,
        jogos
    };

    if (index >= 0) {
        mensalidades[index] = novoRegistro;
    } else {
        mensalidades.push(novoRegistro);
    }

    localStorage.setItem('registros_mensalidade', JSON.stringify(mensalidades));
    // Re-render locks fields again
    carregarMensalistas();
}

function excluirMensalidade(atletaId) {
    const mesReferencia = document.getElementById('mesReferencia').value;
    if (!mesReferencia) return;

    if (!confirm("Deseja excluir o lançamento e zerar os valores deste mês?")) return;

    const idNum = parseInt(atletaId);
    const totalAntes = mensalidades.length;

    // Filter: Remove records that match both the Athlete ID and the Reference Month
    mensalidades = mensalidades.filter(m => {
        const mesmoAtleta = (parseInt(m.atletaId) === idNum); // Ensure number comparison
        const mesmoMes = (m.mesAno === mesReferencia);
        return !(mesmoAtleta && mesmoMes);
    });

    if (mensalidades.length === totalAntes) {
        // Nothing was removed, maybe it didn't exist yet (visual reset)
        alert("Lançamento limpo/excluído com sucesso!");
    } else {
        localStorage.setItem('registros_mensalidade', JSON.stringify(mensalidades));
        alert("Lançamento excluído com sucesso!");
    }

    carregarMensalistas();
}

// === LÓGICA DE JOGOS ===

let teamConfig = JSON.parse(localStorage.getItem('team_config')) || {
    nome: 'TOTTENHAM FC GO',
    responsavel: '',
    brasao: ''
};

let jogos = JSON.parse(localStorage.getItem('jogos_realizados')) || [];

function salvarConfiguracaoTime() {
    const nome = document.getElementById('timeNome').value;
    const responsavel = document.getElementById('timeResponsavel').value;
    const fileInput = document.getElementById('timeBrasao');

    if (!nome) return alert("Digite o nome do time!");

    const salvar = (base64Img) => {
        teamConfig = {
            nome,
            responsavel,
            brasao: base64Img || teamConfig.brasao
        };
        localStorage.setItem('team_config', JSON.stringify(teamConfig));
        alert("Configurações salvas!");
        renderizarJogos();
    };

    if (fileInput.files && fileInput.files[0]) {
        const reader = new FileReader();
        reader.onload = function (e) {
            salvar(e.target.result);
        };
        reader.readAsDataURL(fileInput.files[0]);
    } else {
        salvar(null);
    }
}

function adicionarJogo() {
    const adversario = document.getElementById('jogoAdversario').value;
    const dataHora = document.getElementById('jogoData').value;
    const local = document.getElementById('jogoLocal').value;
    const valor = parseFloat(document.getElementById('jogoValor').value) || 0;
    const fileInput = document.getElementById('jogoBrasaoAdversario');

    if (!adversario || !dataHora || !local) {
        return alert("Preencha todos os campos do jogo!");
    }

    const salvarJogo = (base64Img) => {
        const novoJogo = {
            id: Date.now(),
            adversario,
            dataHora,
            local,
            valor,
            brasaoAdversario: base64Img || ''
        };

        jogos.push(novoJogo);
        localStorage.setItem('jogos_realizados', JSON.stringify(jogos));

        // Limpar form
        document.getElementById('jogoAdversario').value = '';
        document.getElementById('jogoData').value = '';
        document.getElementById('jogoLocal').value = '';
        document.getElementById('jogoValor').value = '';
        document.getElementById('jogoBrasaoAdversario').value = '';

        alert("Jogo adicionado com sucesso!");
        renderizarJogos();
    };

    if (fileInput.files && fileInput.files[0]) {
        const reader = new FileReader();
        reader.onload = function (e) {
            salvarJogo(e.target.result);
        };
        reader.readAsDataURL(fileInput.files[0]);
    } else {
        salvarJogo('');
    }
}

function renderizarJogos() {
    const container = document.getElementById('listaJogos');
    if (!container) return;
    container.innerHTML = '';

    // Ensure teamConfig is loaded
    const teamConfig = JSON.parse(localStorage.getItem('team_config')) || {};

    // Load initial config values into inputs if empty
    if (document.getElementById('timeNome') && !document.getElementById('timeNome').value) {
        document.getElementById('timeNome').value = teamConfig.nome || '';
        document.getElementById('timeResponsavel').value = teamConfig.responsavel || '';
    }

    if (jogos.length === 0) {
        container.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #777;">Nenhum jogo agendado.</p>';
        return;
    }

    jogos.sort((a, b) => new Date(a.dataHora) - new Date(b.dataHora));

    jogos.forEach(jogo => {
        const dateObj = new Date(jogo.dataHora);
        const dataFormatada = dateObj.toLocaleDateString('pt-BR');
        const horaFormatada = dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        const diaSemana = dateObj.toLocaleDateString('pt-BR', { weekday: 'short' });
        const diaSemanaCap = diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1).replace('.', '');

        const valorFormatado = (jogo.valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

        // Team Logos
        const myLogo = teamConfig.brasao ? teamConfig.brasao : 'https://placehold.co/60x60?text=Time';
        const advLogo = jogo.brasaoAdversario ? jogo.brasaoAdversario : 'https://placehold.co/60x60?text=Adv';

        // Calculate Scorers String
        let scorersHtml = '';
        if (jogo.stats) {
            const scorers = [];
            for (const [id, s] of Object.entries(jogo.stats)) {
                if (s.gols > 0) {
                    const player = atletas.find(a => a.id == id);
                    if (player) {
                        scorers.push(`${player.nome} (${s.gols})`);
                    }
                }
            }
            if (scorers.length > 0) {
                scorersHtml = `<div class="game-scorers"><i class="fas fa-futbol"></i> ${scorers.join(', ')}</div>`;
            }
        }

        // Determine Score Display for Header
        let versusContent = 'X';
        if (jogo.golsPro !== undefined && jogo.golsContra !== undefined) {
            versusContent = `<span class="score-pro" style="font-size: 1.8rem;">${jogo.golsPro}</span> <span style="font-size: 1.2rem; color: #ccc;">x</span> <span class="score-contra" style="font-size: 1.8rem;">${jogo.golsContra}</span>`;
        }

        const card = document.createElement('div');
        card.className = 'game-card';
        card.innerHTML = `
            <div class="game-header">
                <div class="team-info">
                    ${teamConfig.brasao ? `<img src="${teamConfig.brasao}" class="team-logo" alt="Logo Time">` : '<i class="fas fa-shield-alt team-logo-placeholder"></i>'}
                    <div class="team-name">${teamConfig.nome || 'Meu Time'}</div>
                </div>
                <div class="versus">${versusContent}</div>
                <div class="team-info">
                    ${jogo.brasaoAdversario ? `<img src="${jogo.brasaoAdversario}" class="team-logo" alt="Logo Adversário">` : '<i class="fas fa-shield-alt team-logo-placeholder"></i>'}
                    <div class="team-name">${jogo.adversario}</div>
                </div>
            </div>
            
            <div class="game-info">
                ${scorersHtml}
                <div>
                    <i class="fas fa-calendar-alt"></i> 
                    ${dataFormatada} ${horaFormatada} (${diaSemanaCap})
                </div>
                <div>
                    <i class="fas fa-map-marker-alt"></i> 
                    ${jogo.local}
                </div>
                <div>
                    <i class="fas fa-money-bill-wave"></i> 
                    Info: ${valorFormatado}
                </div>
            </div>

            <div class="game-actions">
                <button class="btn-card" onclick="editarJogo(${jogo.id})">
                    <i class="fas fa-edit"></i> Editar
                </button>
                <button class="btn-card" onclick="abrirModalAtletas(${jogo.id})" title="Súmula">
                    <i class="fas fa-users"></i> Súmula
                </button>
                <button class="btn-card delete" onclick="excluirJogo(${jogo.id})">
                    <i class="fas fa-trash-alt"></i> Excluir
                </button>
            </div>
        `;
        container.appendChild(card);
    });
}

// === EDIÇÃO E BACKUP ===

let jogoEmEdicaoId = null;

function editarJogo(id) {
    const jogo = jogos.find(j => j.id === id);
    if (!jogo) return;

    jogoEmEdicaoId = id;

    document.getElementById('jogoAdversario').value = jogo.adversario;
    document.getElementById('jogoData').value = jogo.dataHora;
    document.getElementById('jogoLocal').value = jogo.local;
    document.getElementById('jogoValor').value = jogo.valor || '';

    // Change button state
    const btn = document.querySelector('#view-jogos .btn-save[onclick="adicionarJogo()"]');
    if (btn) {
        btn.innerHTML = 'Atualizar Jogo';
        btn.setAttribute('onclick', 'atualizarJogo()');
    }

    // Scroll to form
    document.getElementById('view-jogos').scrollIntoView({ behavior: 'smooth' });
}

function atualizarJogo() {
    if (!jogoEmEdicaoId) return;

    const adversario = document.getElementById('jogoAdversario').value;
    const dataHora = document.getElementById('jogoData').value;
    const local = document.getElementById('jogoLocal').value;
    const valor = parseFloat(document.getElementById('jogoValor').value) || 0;
    const fileInput = document.getElementById('jogoBrasaoAdversario');

    if (!adversario || !dataHora || !local) {
        return alert("Preencha todos os campos!");
    }

    const index = jogos.findIndex(j => j.id === jogoEmEdicaoId);
    if (index !== -1) {
        jogos[index].adversario = adversario;
        jogos[index].dataHora = dataHora;
        jogos[index].local = local;
        jogos[index].valor = valor;

        const finalizarEdicao = () => {
            localStorage.setItem('jogos_realizados', JSON.stringify(jogos));
            alert("Jogo atualizado com sucesso!");

            // Reset form and button
            document.getElementById('jogoAdversario').value = '';
            document.getElementById('jogoData').value = '';
            document.getElementById('jogoLocal').value = '';
            document.getElementById('jogoValor').value = '';
            document.getElementById('jogoBrasaoAdversario').value = '';

            const btn = document.querySelector('#view-jogos .btn-save[onclick="atualizarJogo()"]');
            if (btn) {
                btn.innerHTML = 'Adicionar Jogo';
                btn.setAttribute('onclick', 'adicionarJogo()');
            }

            jogoEmEdicaoId = null;
            renderizarJogos();
        };

        if (fileInput.files && fileInput.files[0]) {
            const reader = new FileReader();
            reader.onload = function (e) {
                jogos[index].brasaoAdversario = e.target.result;
                finalizarEdicao();
            };
            reader.readAsDataURL(fileInput.files[0]);
        } else {
            finalizarEdicao();
        }
    }
}

function fazerBackup() {
    const data = {
        atletas: localStorage.getItem('atletas_futebol'),
        jogos: localStorage.getItem('jogos_realizados'),
        config: localStorage.getItem('team_config'),
        mensalidades: localStorage.getItem('registros_mensalidade')
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_tottenham_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

function realizarLogout() {
    if (confirm("Deseja realmente sair?")) {
        // Simple reload to reset any memory state, though localStorage persists.
        // In a real app, this would clear tokens.
        window.location.reload();
    }
}

// === LOGIN SYSTEM & SECURITY ===

async function hashPassword(password) {
    const msgBuffer = new TextEncoder().encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function checkLogin() {
    // Load Dynamic Logo if exists, otherwise use default Tottenham
    const teamConfig = JSON.parse(localStorage.getItem('team_config')) || {};
    const defaultLogo = "https://upload.wikimedia.org/wikipedia/pt/d/dd/Tottenham_Hotspur.png";

    const logoImg = document.getElementById('loginLogo');
    if (logoImg) {
        logoImg.src = teamConfig.brasao || defaultLogo;
    }

    const isLoggedIn = localStorage.getItem('isLoggedIn');
    if (isLoggedIn === 'true') {
        const loginContainer = document.getElementById('login-container');
        const dashboard = document.getElementById('app-dashboard');
        if (loginContainer) loginContainer.style.display = 'none';
        if (dashboard) dashboard.style.display = 'flex';
    } else {
        const loginContainer = document.getElementById('login-container');
        const dashboard = document.getElementById('app-dashboard');
        if (loginContainer) loginContainer.style.display = 'flex';
        if (dashboard) dashboard.style.display = 'none';
    }
}

async function fazerLogin() {
    const user = document.getElementById('loginUser').value;
    const pass = document.getElementById('loginPass').value;
    const errorMsg = document.getElementById('loginError');

    // Default hash for 'admin'
    const defaultPassHash = "8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918";

    // Get stored hash or use default
    const storedHash = localStorage.getItem('auth_pass_hash') || defaultPassHash;

    const inputHash = await hashPassword(pass);

    if (user === 'admin' && inputHash === storedHash) {
        localStorage.setItem('isLoggedIn', 'true');
        checkLogin();
    } else {
        errorMsg.style.display = 'block';
    }
}

// === ALTERAR SENHA ===

function abrirModalSenha() {
    document.getElementById('modalAlterarSenha').style.display = 'flex';
}

function fecharModalSenha() {
    document.getElementById('modalAlterarSenha').style.display = 'none';
    document.getElementById('senhaAtual').value = '';
    document.getElementById('novaSenha').value = '';
    document.getElementById('confirmaSenha').value = '';
}

async function salvarNovaSenha() {
    const senhaAtual = document.getElementById('senhaAtual').value;
    const novaSenha = document.getElementById('novaSenha').value;
    const confirmaSenha = document.getElementById('confirmaSenha').value;

    if (!senhaAtual || !novaSenha || !confirmaSenha) {
        return alert("Preencha todos os campos!");
    }

    if (novaSenha !== confirmaSenha) {
        return alert("A nova senha e a confirmação não conferem!");
    }

    // Default hash for 'admin'
    const defaultPassHash = "8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918";
    const storedHash = localStorage.getItem('auth_pass_hash') || defaultPassHash;
    const currentInputHash = await hashPassword(senhaAtual);

    if (currentInputHash !== storedHash) {
        return alert("Senha atual incorreta!");
    }

    const newHash = await hashPassword(novaSenha);
    localStorage.setItem('auth_pass_hash', newHash);

    alert("Senha alterada com sucesso! Faça login novamente.");
    fecharModalSenha();
    realizarLogout();
}

function realizarLogout() {
    if (confirm("Deseja realmente sair?")) {
        localStorage.removeItem('isLoggedIn');
        window.location.reload();
    }
}

function excluirJogo(id) {
    if (confirm("Tem certeza que deseja excluir este jogo?")) {
        jogos = jogos.filter(j => j.id !== id);
        localStorage.setItem('jogos_realizados', JSON.stringify(jogos));
        renderizarJogos();
    }
}

// === LÓGICA DO MODAL DE ESCALAÇÃO / SÚMULA ===
let jogoAtualId = null;

function abrirModalAtletas(jogoId) {
    jogoAtualId = jogoId;
    const jogo = jogos.find(j => j.id === jogoId);
    if (!jogo) return;

    document.getElementById('modalTitulo').innerText = `Súmula vs ${jogo.adversario}`;
    document.getElementById('golsAdversario').value = jogo.golsContra || 0;
    document.getElementById('formacaoTatíca').value = jogo.formacao || '';

    const container = document.getElementById('modalListaAtletas');
    container.innerHTML = '';

    const stats = jogo.stats || {}; // Object {atletaId: {gols: 0, assists: 0, played: true}}

    if (atletas.length === 0) {
        container.innerHTML = '<p>Nenhum atleta cadastrado.</p>';
    } else {
        atletas.forEach(atleta => {
            const playerStats = stats[atleta.id] || { gols: 0, assists: 0, played: false };
            // Fallback for deprecated 'atletasRelacionados' array from previous version
            if (jogo.atletasRelacionados && jogo.atletasRelacionados.includes(atleta.id) && !stats[atleta.id]) {
                playerStats.played = true;
            }

            const item = document.createElement('div');
            item.className = 'checklist-item';

            // Checkbox and Name
            const leftCol = document.createElement('label');
            leftCol.innerHTML = `<input type="checkbox" id="chk_${atleta.id}" value="${atleta.id}" ${playerStats.played ? 'checked' : ''}> ${atleta.nome}`;

            // Goals Input
            const midCol = document.createElement('div');
            midCol.style.textAlign = 'center';
            midCol.innerHTML = `<input type="number" min="0" class="stat-input goal-input" data-id="${atleta.id}" value="${playerStats.gols}" placeholder="0">`;

            // Assists Input
            const rightCol = document.createElement('div');
            rightCol.style.textAlign = 'center';
            rightCol.innerHTML = `<input type="number" min="0" class="stat-input assist-input" data-id="${atleta.id}" value="${playerStats.assists}" placeholder="0">`;

            item.appendChild(leftCol);
            item.appendChild(midCol);
            item.appendChild(rightCol);
            container.appendChild(item);
        });
    }

    document.getElementById('modalAtletasJogo').style.display = 'flex';
}

function fecharModalAtletas() {
    document.getElementById('modalAtletasJogo').style.display = 'none';
    jogoAtualId = null;
}

function salvarAtletasJogo() {
    if (!jogoAtualId) return;

    const gameIndex = jogos.findIndex(j => j.id === jogoAtualId);
    if (gameIndex === -1) return;

    const stats = {};
    const atletasRelacionados = [];
    let totalGolsPro = 0;

    // Iterate inputs
    const goalInputs = document.querySelectorAll('.goal-input');
    goalInputs.forEach(input => {
        const id = parseInt(input.getAttribute('data-id'));
        const gols = parseInt(input.value) || 0;
        const assistInput = document.querySelector(`.assist-input[data-id="${id}"]`);
        const assists = parseInt(assistInput.value) || 0;
        const checkbox = document.getElementById(`chk_${id}`);
        const played = checkbox.checked;

        if (played) {
            atletasRelacionados.push(id);
            stats[id] = { gols, assists, played: true };
            totalGolsPro += gols;
        } else if (gols > 0 || assists > 0) {
            // Implicitly played if has stats
            atletasRelacionados.push(id);
            stats[id] = { gols, assists, played: true };
            totalGolsPro += gols;
            // Also check the box visually just in case but we are saving logic here
        }
    });

    const golsContra = parseInt(document.getElementById('golsAdversario').value) || 0;
    const formacao = document.getElementById('formacaoTatíca').value;

    jogos[gameIndex].stats = stats;
    jogos[gameIndex].atletasRelacionados = atletasRelacionados; // Keep for backward compat
    jogos[gameIndex].golsPro = totalGolsPro;
    jogos[gameIndex].golsContra = golsContra;
    jogos[gameIndex].formacao = formacao;

    localStorage.setItem('jogos_realizados', JSON.stringify(jogos));
    alert("Súmula salva com sucesso!");
    fecharModalAtletas();
}

function copiarEscalacao() {
    if (!jogoAtualId) return;

    const jogo = jogos.find(j => j.id === jogoAtualId);
    if (!jogo) return;

    // Get checked boxes or saved list? match current visual state of checkboxes
    const checkboxes = document.querySelectorAll('#modalListaAtletas input[type="checkbox"]:checked');
    const idsSelecionados = Array.from(checkboxes).map(cb => parseInt(cb.value));

    if (idsSelecionados.length === 0) return alert("Nenhum atleta selecionado para gerar a lista.");

    const relacionados = atletas.filter(a => idsSelecionados.includes(a.id));

    // Sort by position or name? Let's sort by name for now
    relacionados.sort((a, b) => a.nome.localeCompare(b.nome));

    const dateObj = new Date(jogo.dataHora);
    const dataFormatada = dateObj.toLocaleDateString('pt-BR');
    const horaFormatada = dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const valorFormatado = (jogo.valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    let texto = `⚽ *JOGO CONFIRMADO* ⚽\n`;
    texto += `🆚 ${teamConfig.nome} vs ${jogo.adversario}\n`;
    texto += `📅 ${dataFormatada} ⏰ ${horaFormatada}\n`;
    texto += `📍 ${jogo.local}\n`;
    texto += `💰 Custo: ${valorFormatado}\n\n`;
    texto += `📋 *LISTA DE RELACIONADOS (${relacionados.length}):*\n`;

    relacionados.forEach((atleta, index) => {
        texto += `${index + 1}. ${atleta.nome} (${atleta.posicao})\n`;
    });

    texto += `\n🚀 *Vamos pra cima!*`;

    navigator.clipboard.writeText(texto).then(() => {
        alert("Lista copiada para a área de transferência! Agora cole no WhatsApp do time.");

        // Optional: Open WhatsApp Web with text?
        // It's tricky with newlines in URL, often better to just copy.
        // But we can try opening a blank whatsapp window for convenience.
        // window.open('https://web.whatsapp.com/', '_blank');
    }).catch(err => {
        console.error('Erro ao copiar', err);
        alert("Erro ao copiar texto automatically. Tente manualmente.");
    });
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    const today = new Date();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    const mesInput = document.getElementById('mesReferencia');
    if (mesInput) {
        mesInput.value = `${year}-${month}`;
    }

    renderizar();
    renderizarJogos();
    limparOrfaosFinanceiros(); // Limpa sujeira de testes anteriores ao iniciar
});

// Navigation Logic
function showView(viewId) {
    document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));

    document.getElementById('view-' + viewId).classList.add('active');

    const links = document.querySelectorAll('.nav-link');
    links.forEach(link => {
        if (link.getAttribute('onclick').includes(viewId)) {
            link.classList.add('active');
        }
    });

    if (viewId === 'mensalista') {
        carregarMensalistas();
    }
    if (viewId === 'jogos') {
        renderizarJogos();
    }
    if (viewId === 'financeiro') {
        renderizarFinanceiro();
    }
    if (viewId === 'relatorios') {
        renderizarRelatorios();
    }
}

function renderizarRelatorios() {
    // 1. Team Stats (Goals Pro/Contra, Clean Sheets)
    let totalGolsPro = 0;
    let totalGolsContra = 0;
    let cleanSheets = 0;
    let scoringDrought = 0; // Games without scoring
    let formacoesCount = {};

    jogos.forEach(jogo => {
        // Skip games that don't have a result yet (e.g. not played/saved in summary)
        if (jogo.golsPro === undefined || jogo.golsContra === undefined) return;

        const gp = jogo.golsPro;
        const gc = jogo.golsContra;

        totalGolsPro += gp;
        totalGolsContra += gc;

        if (gc === 0) cleanSheets++;
        if (gp === 0) scoringDrought++;

        if (jogo.formacao) {
            formacoesCount[jogo.formacao] = (formacoesCount[jogo.formacao] || 0) + 1;
        }
    });

    document.getElementById('repGolsPro').innerText = totalGolsPro;
    document.getElementById('repGolsContra').innerText = totalGolsContra;
    document.getElementById('repCleanSheets').innerText = cleanSheets;
    document.getElementById('repDrought').innerText = scoringDrought;

    // Most Used Formation
    let maxFormacaoName = 'Indefinida';
    let maxFormacaoCount = 0;
    for (const [form, count] of Object.entries(formacoesCount)) {
        if (count > maxFormacaoCount) {
            maxFormacaoCount = count;
            maxFormacaoName = form;
        }
    }
    document.getElementById('repFormacao').innerText = maxFormacaoName;

    // 2. Player Stats (Aggregating)
    const playerStats = {}; // { id: { nome: '', gols: 0, assists: 0, jogos: 0 } }

    // Init with all athletes
    atletas.forEach(a => {
        playerStats[a.id] = { nome: a.nome, gols: 0, assists: 0, jogos: 0 };
    });

    jogos.forEach(jogo => {
        const stats = jogo.stats || {};
        // Also support legacy 'atletasRelacionados' for attendance counts if stats missing
        const relacionados = jogo.atletasRelacionados || [];

        relacionados.forEach(id => {
            if (playerStats[id]) playerStats[id].jogos++;
        });

        // Add goals/assists from detailed stats
        for (const [id, s] of Object.entries(stats)) {
            const pid = parseInt(id);
            if (playerStats[pid]) {
                playerStats[pid].gols += (s.gols || 0);
                playerStats[pid].assists += (s.assists || 0);
                // Note: 'jogos' is already counted above via atletasRelacionados which includes stats keys
            }
        }
    });

    // Convert to array
    const statsArray = Object.values(playerStats);

    // Helper to render lists with Progress Bars
    const renderList = (containerId, data, getValueFn, labelFn) => {
        const container = document.getElementById(containerId);
        container.innerHTML = '';

        // Sort descending
        data.sort((a, b) => getValueFn(b) - getValueFn(a));

        // Take top 5
        const top5 = data.slice(0, 5).filter(item => getValueFn(item) > 0);

        if (top5.length === 0) {
            container.innerHTML = '<p style="color:#94a3b8; font-style:italic;">Ainda sem dados para exibir.</p>';
            return;
        }

        // Find max value for percentage calc
        const maxValue = Math.max(...top5.map(item => getValueFn(item)));

        top5.forEach((item, index) => {
            const value = getValueFn(item);
            const percentage = (value / maxValue) * 100;

            const div = document.createElement('div');
            div.className = 'ranking-item';
            div.innerHTML = `
                <div class="ranking-info">
                    <div class="ranking-details">
                        <span class="rank-badge">${index + 1}</span> 
                        ${item.nome}
                    </div>
                    <span class="value">${labelFn(item)}</span>
                </div>
                <div class="pro-bar-bg">
                    <div class="pro-bar-fill" style="width: ${percentage}%"></div>
                </div>
            `;
            container.appendChild(div);
        });
    };

    // Render Top Scorers
    renderList('listArtilheiros', [...statsArray], (i) => i.gols, (i) => `${i.gols}`);

    // Render Top Assists
    renderList('listAssistencias', [...statsArray], (i) => i.assists, (i) => `${i.assists}`);

    // === 3. Pontualidade (Pagamentos) ===
    const mesInputRel = document.getElementById('mesRelatorios');
    if (!mesInputRel.value) {
        const today = new Date();
        mesInputRel.value = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    }
    const mesRef = mesInputRel.value;

    const containerPontualidade = document.getElementById('listPontualidade');
    containerPontualidade.innerHTML = '';

    // Sort athletes: Paid first, then by name
    const atletasStatus = atletas.map(a => {
        // Goleiros rule
        let isGoleiro = (a.posicao === 'Goleiro');
        let pagou = false; // Default for non-Goleiro

        if (isGoleiro) {
            // Goleiro is practically "Paid/Exempt"
            // We treat as 'pagou' for sorting purposes if we want them fast in the list? 
            // Or just distinct. Let's mark 'pagou' true so they show up green/blue.
            pagou = true;
        } else {
            pagou = mensalidades.some(m => m.atletaId == a.id && m.mesAno === mesRef && parseFloat(m.valor) > 0);
        }

        return { ...a, pagou, isGoleiro };
    });

    atletasStatus.sort((a, b) => {
        if (a.pagou === b.pagou) return a.nome.localeCompare(b.nome);
        return a.pagou ? -1 : 1; // "Paid" (or Exempt) first
    });

    if (atletasStatus.length === 0) {
        containerPontualidade.innerHTML = '<p style="color:#94a3b8;">Nenhum atleta cadastrado.</p>';
    } else {
        atletasStatus.forEach(a => {
            const div = document.createElement('div');
            div.className = 'ranking-item';

            // Styling
            let color = '#e74c3c'; // Red (Pendente)
            let statusText = 'PENDENTE';
            let icon = '<i class="fas fa-times-circle"></i>';

            if (a.isGoleiro) {
                color = '#3498db'; // Blue (Isento)
                statusText = 'ISENTO';
                icon = '<i class="fas fa-user-shield"></i>';
            } else if (a.pagou) {
                color = '#2ecc71'; // Green (Pago)
                statusText = 'PAGO';
                icon = '<i class="fas fa-check-circle"></i>';
            }

            div.innerHTML = `
                <div class="ranking-info" style="width: 100%; display: flex; justify-content: space-between; align-items: center;">
                    <div class="ranking-details">
                        <span style="font-weight: bold;">${a.nome}</span>
                        ${a.isGoleiro ? '<small style="color:#ccc; margin-left:5px;">(Goleiro)</small>' : ''}
                    </div>
                    <span class="value" style="color: ${color}; font-size: 0.9rem; display: flex; align-items: center; gap: 5px;">
                        ${icon} ${statusText}
                    </span>
                </div>
            `;
            // Add a subtle bottom border
            div.style.borderBottom = '1px solid #eee';
            containerPontualidade.appendChild(div);
        });
    }
}

function renderizarFinanceiro() {
    const mesInput = document.getElementById('mesFinanceiro');
    if (!mesInput) return;

    // Set default month if empty
    if (!mesInput.value) {
        const today = new Date();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const year = today.getFullYear();
        mesInput.value = `${year}-${month}`;
    }

    const mesReferencia = mesInput.value; // YYYY-MM

    // 1. Calculate Monthly Income (Mensalidades)
    // Filter monthly fees for the selected month
    const totalEntradas = mensalidades
        .filter(m => m.mesAno === mesReferencia)
        .reduce((sum, m) => sum + (parseFloat(m.valor) || 0), 0);

    // 2. Calculate Monthly Expenses (Jogos)
    // Filter games happening in the selected month
    const totalSaidas = jogos
        .filter(j => j.dataHora.startsWith(mesReferencia))
        .reduce((sum, j) => sum + (parseFloat(j.valor) || 0), 0);

    // 3. Monthly Balance
    const saldoMes = totalEntradas - totalSaidas;

    // 4. Total Accumulated Balance (All time)
    // Sum of all payments ever made - Sum of all game costs ever
    const totalEntradasGeral = mensalidades.reduce((sum, m) => sum + (parseFloat(m.valor) || 0), 0);
    const totalSaidasGeral = jogos.reduce((sum, j) => sum + (parseFloat(j.valor) || 0), 0);
    const saldoTotal = totalEntradasGeral - totalSaidasGeral;

    // Update DOM
    const formatMoney = (val) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    document.getElementById('totalEntradas').innerText = formatMoney(totalEntradas);
    document.getElementById('totalSaidas').innerText = formatMoney(totalSaidas);

    const elSaldoMes = document.getElementById('saldoMes');
    elSaldoMes.innerText = formatMoney(saldoMes);
    // Optional coloring for balance?
    // elSaldoMes.style.color = saldoMes >= 0 ? 'white' : '#ffcccc'; 

    document.getElementById('saldoTotal').innerText = formatMoney(saldoTotal);
}
