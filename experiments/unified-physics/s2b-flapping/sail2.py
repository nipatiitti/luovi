"""2D sail section: tension-only chain + lumped-vortex lattice + shed wake.
Throwaway kill experiment S2/S3. All constants are global, listed in CONST."""
import numpy as np
TWO_PI = 2*np.pi
CONST = dict(
    rho=1.225,        # air density kg/m3
    U=8.0,            # wind m/s
    chord=3.0,        # m
    m_cloth=0.3,      # kg/m2 Dacron
    EA_cloth=3.3e5,   # N per metre of span (critic-1's thread value; ~1.3 GPa x 0.25 mm)
    kappa_slack=1e-3, # residual compressive stiffness fraction (note B, Zhang & Kiendl idea)
    EA_sheet=1.5e5,   # N, ~8 mm polyester braid
    anchor=(2.6, -1.2),   # sheet lead (traveller), to windward of the boom end
    boom_len=2.94,    # m: luff-to-clew strut, 2% shorter than the cloth -> about 9% camber
    EA_boom=5e6,      # N, aluminium tube
    m_clew=0.5,       # kg per metre of span: boom end and clew fitting share

    Cf=0.008,         # skin friction, both sides, turbulent plate at Re~1.6e6
    wake_len=2.5,     # chords of wake kept
    core=0.25,        # vortex kernel cut-off radius as fraction of panel length (Rankine: no effect beyond it)
    EI=5e-4,          # N m per metre width: cloth bending stiffness (estimate for firm 250 g Dacron; range 1e-4 to 2.5e-3)
    loss=0.1, loss_hz=5.0,   # cloth hysteresis: loss factor 0.1 at 5 Hz, as a stiffness-proportional damper (estimate)
    crimp=0.0,        # crimp strain: thread stiffness ramps from 0 to full over this strain (0 = sharp tension-only law)
    Scrit=0.0,        # luff suction limit in first-panel units (0 = no luff shedding); 0.4 equals Ramesh A0 = 0.10
    polar_peak=1.3, polar_slope=4.5,  # variant d: Cn = peak*tanh(slope*sin(a)/peak)
)

def induced(Q, P, g, core2):
    """velocity at points Q (m,2) from point vortices P (k,2), strengths g (k) (ccw +)"""
    dx = Q[:, None, 0]-P[None, :, 0]; dy = Q[:, None, 1]-P[None, :, 1]
    w = g[None, :]/(TWO_PI*np.maximum(dx*dx+dy*dy, core2))
    return np.stack([-(w*dy).sum(1), (w*dx).sum(1)], 1)

def genalpha(rinf, scheme='ch'):
    if scheme == 'wbz':      # Wood-Bossak-Zienkiewicz: forces at the END of the step, inertia averaged; same high-frequency radius
        am = (rinf-1)/(rinf+1); af = 0.0
        return am, af, 0.5-am, 0.25*(1-am)**2
    am = (2*rinf-1)/(rinf+1); af = rinf/(rinf+1)
    return am, af, 0.5-am+af, 0.25*(1-am+af)**2

class Sim:
    def __init__(s, N=16, hz=240, variant='c', niter=2, rinf=0.7, sheet0=0.55,
                 lagrem=False, flow_every=1, wind_ramp=1.0, linesearch=False, safe_tangent=False, scheme='ch', **over):
        s.c = dict(CONST); s.c.update(over)
        s.N = N; s.h = 1.0/hz; s.variant = variant; s.niter = niter
        s.am, s.af, s.gam, s.bet = genalpha(rinf, scheme)
        s.linesearch = linesearch; s.safe_tangent = safe_tangent; s.nsolve = 0; s.wdir = lambda t: 0.0
        s.lagrem = lagrem; s.flow_every = flow_every; s.wind_ramp = wind_ramp
        c = s.c['chord']; s.l0 = c/N
        s.anchor = np.array(s.c['anchor']); s.Ls = sheet0
        # initial: cloth on a circular arc over the boom, boom end at distance sheet0 from the anchor
        Lb = s.c['boom_len']; lo, hi = np.arctan2(s.anchor[1], s.anchor[0]), 0.0
        for _ in range(60):
            th = 0.5*(lo+hi)
            d = np.linalg.norm(Lb*np.array([np.cos(th), np.sin(th)])-s.anchor)
            if d > s.Ls: hi = th
            else: lo = th
        if np.linalg.norm(np.array([Lb, 0.])-s.anchor) <= s.Ls: th = 0.0
        a, b = 1e-6, 3.0
        for _ in range(80):
            ph = 0.5*(a+b)
            if np.sin(ph)/ph > Lb/c: a = ph
            else: b = ph
        R = c/(2*ph); ang = -ph+2*ph*np.arange(N+1)/N
        xa = R*(np.sin(ang)+np.sin(ph)); ya = R*(np.cos(ang)-np.cos(ph))
        ct, st = np.cos(th), np.sin(th)
        s.X = np.stack([ct*xa-st*ya, st*xa+ct*ya], 1)
        s.V = np.zeros((N+1, 2)); s.Acc = np.zeros((N+1, 2)); s.Vprev = s.V.copy()
        m = s.c['m_cloth']*s.l0*np.ones(N+1); m[0] *= 0.5; m[N] *= 0.5
        m[N] += s.c['m_clew']
        s.mnode = m
        D = np.zeros((N-1, N+1)); i = np.arange(N-1); D[i, i] = 1; D[i, i+1] = -2; D[i, i+2] = 1
        Kb1 = s.c['EI']/s.l0**3*(D.T@D)
        s.Kb = np.kron(Kb1, np.eye(2))            # constant bending stiffness (vector-curvature form)
        s.tau = s.c['loss']/(2*np.pi*s.c['loss_hz'])
        s.Cmat = np.tril(np.ones((N, N)), -1)+0.5*np.eye(N)
        s.wakeP = np.zeros((0, 2)); s.wakeG = np.zeros(0); s.Gfree = 0.0
        s.Gam_prev = np.zeros(N); s.t = 0.0; s.step_i = 0
        s.Ts = 0.0; s.T1 = 0.0; s.Gam = np.zeros(N); s.blown = False
        sa = (np.arange(N+1))*s.l0
        s.mlump = 2*s.c['rho']*np.sqrt(sa*(c-sa))*s.l0   # note B lumped added mass per node
        sm = (np.arange(N)+0.5)*s.l0; s.mlump_p = 2*s.c['rho']*np.sqrt(sm*(c-sm))*s.l0
    # ---------- structure
    def struct(s, X, V=None, want_K=True, safe=False):
        """forces (incl. bending and hysteresis damping), tensions, and K, C matrices"""
        N = s.N; EA = s.c['EA_cloth']; kap = s.c['kappa_slack']; ec = s.c['crimp']
        d = X[1:]-X[:-1]; L = np.sqrt((d*d).sum(1)); e = d/L[:, None]
        eps = (L-s.l0)/s.l0
        taut = eps > 0
        if ec > 0:
            toe = taut & (eps < ec)
            T = np.where(taut, np.where(toe, EA*eps*eps/(2*ec), EA*(eps-0.5*ec)), kap*EA*eps)
            km = np.where(taut, np.where(toe, EA*eps/ec, EA), kap*EA)/s.l0
            km = np.maximum(km, kap*EA/s.l0)
        else:
            T = np.where(taut, EA*eps, kap*EA*eps)
            km = np.where(taut, EA/s.l0, kap*EA/s.l0)
        cd = s.tau*km*taut                         # axial hysteresis damper, taut threads only
        if V is not None:
            Td = cd*((V[1:]-V[:-1])*e).sum(1)
        else:
            Td = 0.0
        Tt = T+Td
        F = np.zeros((N+1, 2)); F[:-1] += Tt[:, None]*e; F[1:] -= Tt[:, None]*e
        F -= (s.Kb@X.ravel()).reshape(N+1, 2)
        if V is not None: F -= s.tau*(s.Kb@V.ravel()).reshape(N+1, 2)
        ds = s.anchor-X[N]; Lsh = np.sqrt(ds@ds); es = ds/Lsh
        ks = s.c['EA_sheet']/s.Ls
        Ts = ks*max(0.0, Lsh-s.Ls)
        F[N] += Ts*es
        Lb = s.c['boom_len']; kb = s.c['EA_boom']/Lb
        db = X[N]-X[0]; lb = np.sqrt(db@db); eb = db/lb; Tb = kb*(lb-Lb)
        F[N] -= Tb*eb
        if not want_K: return F, T, Ts
        if safe: km = np.full(N, EA/s.l0)
        kg = np.where(taut, T/L, 0.0)
        ee = e[:, :, None]*e[:, None, :]
        Ke = (km-kg)[:, None, None]*ee+kg[:, None, None]*np.eye(2)[None]
        K = np.zeros((N+1, 2, N+1, 2)); i = np.arange(N)
        K[i, :, i, :] += Ke; K[i+1, :, i+1, :] += Ke
        K[i, :, i+1, :] -= Ke; K[i+1, :, i, :] -= Ke
        Ce = cd[:, None, None]*ee
        C = np.zeros((N+1, 2, N+1, 2))
        C[i, :, i, :] += Ce; C[i+1, :, i+1, :] += Ce
        C[i, :, i+1, :] -= Ce; C[i+1, :, i, :] -= Ce
        if Ts > 0 or safe:
            K[N, :, N, :] += (ks-Ts/Lsh)*np.outer(es, es)+Ts/Lsh*np.eye(2)
        kgb = max(Tb, 0.0)/lb
        K[N, :, N, :] += (kb-kgb)*np.outer(eb, eb)+kgb*np.eye(2)
        n2 = 2*N+2
        return F, T, Ts, K.reshape(n2, n2)+s.Kb, C.reshape(n2, n2)+s.tau*s.Kb
    def energy(s, X):
        """elastic energy of threads, sheet, boom and bending (the potential whose gradient is minus struct's force)"""
        EA = s.c['EA_cloth']; kap = s.c['kappa_slack']; ec = s.c['crimp']
        d = X[1:]-X[:-1]; L = np.sqrt((d*d).sum(1)); eps = (L-s.l0)/s.l0
        if ec > 0:
            u = np.where(eps > 0, np.where(eps < ec, eps**3/(6*ec), 0.5*eps*eps-0.5*eps*ec+ec*ec/6), 0.5*kap*eps*eps)
        else:
            u = np.where(eps > 0, 0.5*eps*eps, 0.5*kap*eps*eps)
        U = EA*s.l0*u.sum()
        ds = s.anchor-X[-1]; st = max(0.0, np.sqrt(ds@ds)-s.Ls); U += 0.5*s.c['EA_sheet']/s.Ls*st*st
        Lb = s.c['boom_len']; U += 0.5*s.c['EA_boom']/Lb*(np.linalg.norm(X[-1]-X[0])-Lb)**2
        xr = X.ravel(); U += 0.5*xr@(s.Kb@xr)
        return U
    # ---------- wind
    def wind(s, t):
        U = s.c['U']
        if t < s.wind_ramp: U *= 0.5*(1-np.cos(np.pi*t/s.wind_ramp))
        a = s.wdir(t)
        return np.array([U*np.cos(a), U*np.sin(a)])
    # ---------- aero
    def geom(s, X):
        d = X[1:]-X[:-1]; L = np.sqrt((d*d).sum(1)); tg = d/L[:, None]
        nr = np.stack([-tg[:, 1], tg[:, 0]], 1)
        return L, tg, nr, X[:-1]+0.25*d, X[:-1]+0.75*d
    def aero(s):
        """returns nodal explicit force (N+1,2) and node added-mass matrix (2N+2 square)"""
        N = s.N; rho = s.c['rho']; W = s.wind(s.t); X = s.X; V = s.V
        L, tg, nr, xv, xc = s.geom(X)
        Fnode = np.zeros((N+1, 2)); Ma = None
        vq = 0.75*V[:-1]+0.25*V[1:]      # cloth velocity at quarter point
        vm = 0.5*(V[:-1]+V[1:])
        # skin friction (all variants)
        Vt = ((W-vm)*tg).sum(1)
        ft = 0.5*rho*s.c['Cf']*np.abs(Vt)*Vt*L
        Fnode[:-1] += 0.5*ft[:, None]*tg; Fnode[1:] += 0.5*ft[:, None]*tg
        if s.variant == 'd':
            Vr = W-vm; sp2 = (Vr*Vr).sum(1); sp = np.sqrt(sp2)+1e-12
            sina = (Vr*nr).sum(1)/sp
            pk = s.c['polar_peak']; Cn = pk*np.tanh(s.c['polar_slope']*sina/pk)
            fn = 0.5*rho*sp2*Cn*L
            Fnode[:-1] += 0.5*fn[:, None]*nr; Fnode[1:] += 0.5*fn[:, None]*nr
            s.Gam = fn/(rho*8.0); s.Fn = fn
            return Fnode, None
        core2 = (s.c['core']*s.l0)**2
        if s.step_i % s.flow_every == 0 or not hasattr(s, 'Ainv'):
            xw = X[N]+0.25*L[-1]*tg[-1]
            dx = xc[:, None, :]-xv[None, :, :]; r2 = np.maximum((dx*dx).sum(2), core2)
            un = (-dx[:, :, 1]*nr[:, None, 0]+dx[:, :, 0]*nr[:, None, 1])/(TWO_PI*r2)
            dw = xc-xw[None, :]; r2w = np.maximum((dw*dw).sum(1), core2)
            unw = (-dw[:, 1]*nr[:, 0]+dw[:, 0]*nr[:, 1])/(TWO_PI*r2w)
            A = un-unw[:, None]
            s.Ainv = np.linalg.inv(A); s.unw = unw; s.xw = xw
            Mp = rho*L[:, None]*(s.Cmat@s.Ainv)
            s.Mp = Mp
        if len(s.wakeG):
            uw = induced(np.vstack([xc, xv]), s.wakeP, s.wakeG, core2)
            uwc, uwv = uw[:N], uw[N:]
        else:
            uwc = uwv = np.zeros((N, 2))
        wa = getattr(s, 'w_aft', 0.5)   # weight of the aft node when sampling cloth velocity / applying force
        vc = (1-wa)*V[:-1]+wa*V[1:]; vcp = (1-wa)*s.Vprev[:-1]+wa*s.Vprev[1:]
        base = -((W+uwc)*nr).sum(1)+s.Gfree*s.unw
        Gam = s.Ainv@(base+(vc*nr).sum(1))
        Gst = s.Ainv@(base+(vcp*nr).sum(1))      # same state, previous cloth velocity
        s.gle = 0.0
        if s.c['Scrit'] > 0:
            # division-free luff suction test: Gamma_1^2 against Scrit^2 V^2 c dx (wind relative to the pinned luff)
            Gc2 = s.c['Scrit']**2*(W@W)*s.c['chord']*L[0]
            if Gam[0]*Gam[0] > Gc2:
                sg = np.sign(Gam[0]); xle = X[0]-sg*0.25*L[0]*nr[0]
                dl = xc-xle[None, :]; r2l = np.maximum((dl*dl).sum(1), core2)
                col = (-dl[:, 1]*nr[:, 0]+dl[:, 0]*nr[:, 1])/(TWO_PI*r2l)
                q = s.Ainv@(col-s.unw)
                if abs(q[0]) > 1e-9:
                    g = (Gam[0]-sg*np.sqrt(Gc2))/q[0]
                    Gam = Gam-g*q; Gst = Gst-g*q; s.gle = g; s.xle = xle
        fn = -rho*(((W+uwv-vm)*tg).sum(1))*Gam    # circulatory, per panel, along n
        wf = getattr(s, 'w_aft_force', wa)
        Fnode[:-1] += (1-wf)*fn[:, None]*nr; Fnode[1:] += wf*fn[:, None]*nr
        P = np.zeros((N, 2*N+2)); i = np.arange(N)
        P[i, 2*i] = (1-wa)*nr[:, 0]; P[i, 2*i+1] = (1-wa)*nr[:, 1]
        P[i, 2*i+2] = wa*nr[:, 0]; P[i, 2*i+3] = wa*nr[:, 1]
        if s.step_i == 0: s.Gam_prev = Gam.copy(); Gst = Gam
        if s.variant == 'a':
            gdot = (Gam-s.Gam_prev)/s.h
        else:
            gdot = (Gst-s.Gam_prev)/s.h
        fu = -rho*L*(s.Cmat@gdot)*getattr(s, 'rest_scale', 1.0)
        if s.variant in ('c', 'cu'):
            Mp = s.Mp
            if s.variant == 'c':
                Ms = 0.5*(Mp+Mp.T)
                if s.lagrem:
                    fu = fu-(Mp-Ms)@(P@s.Acc.ravel())
                Mp = Ms
            Ma = P.T@Mp@P
        elif s.variant == 'b':      # note B's flat-plate lumped mass, at panel centres
            Ma = P.T@np.diag(s.mlump_p)@P
        elif s.variant == 'bn':     # same formula lumped at nodes (vanishes at luff and leech)
            nn = np.zeros((N+1, 2)); nn[:-1] += nr; nn[1:] += nr
            nn /= np.sqrt((nn*nn).sum(1))[:, None]
            Ma = np.zeros((2*N+2, 2*N+2))
            for k in range(N+1):
                Ma[2*k:2*k+2, 2*k:2*k+2] = s.mlump[k]*np.outer(nn[k], nn[k])
        Fnode += (P.T@fu).reshape(N+1, 2)
        s.Gam = Gam; s.Fn = fn+fu
        return Fnode, Ma
    def wake_advance(s):
        if s.variant == 'd': return
        h = s.h; W = s.wind(s.t)
        s.wakeP = s.wakeP+h*W[None, :]
        if (s.step_i+1) % s.flow_every == 0:
            if getattr(s, 'gle', 0.0) != 0.0:
                s.wakeP = np.vstack([(s.xle+h*W)[None, :], s.wakeP]); s.wakeG = np.append(s.gle, s.wakeG); s.Gfree += s.gle
            gw = -s.Gam.sum()-s.Gfree
            s.wakeP = np.vstack([s.wakeP, (s.xw+h*W)[None, :]])
            s.wakeG = np.append(s.wakeG, gw); s.Gfree += gw
        if len(s.wakeG) and s.step_i % 8 == 0:
            far = ((s.wakeP-s.X[-1][None, :])**2).sum(1) > (s.c['wake_len']*s.c['chord'])**2
            if far.any(): s.wakeP = s.wakeP[~far]; s.wakeG = s.wakeG[~far]
    # ---------- one step
    def step(s, sheet_len=None):
        if s.blown: return
        N = s.N; h = s.h
        if sheet_len is not None: s.Ls = sheet_len
        Fext, Ma = s.aero()
        M = np.diag(np.repeat(s.mnode, 2))
        if Ma is not None: M = M+Ma
        nf = N-1 if getattr(s, 'pin_clew', False) else N
        fr = slice(2, 2*nf+2)
        Mff = M[fr, fr]
        xn = s.X; vn = s.V; an = s.Acc
        a1 = an.copy()*getattr(s, 'pred', 1.0); a1[0] = 0
        am, af, gam, bet = s.am, s.af, s.gam, s.bet
        def resid(a1):
            x1 = xn+h*vn+h*h*((0.5-bet)*an+bet*a1)
            v1 = vn+h*((1-gam)*an+gam*a1)
            xa = (1-af)*x1+af*xn; va = (1-af)*v1+af*vn
            aa = (1-am)*a1+am*an
            return xa, va, aa
        for it in range(s.niter):
            xa, va, aa = resid(a1)
            Fs, T, Ts, K, C = s.struct(xa, va, safe=(s.safe_tangent and it == 0))
            R = (M@aa.ravel())[fr]-(Fs+Fext).ravel()[fr]
            J = (1-am)*Mff+(1-af)*(bet*h*h*K[fr, fr]+gam*h*C[fr, fr])
            try:
                da = np.linalg.solve(J, -R)
            except np.linalg.LinAlgError:
                s.blown = True; return
            s.nsolve += 1
            da = da.reshape(nf, 2)
            if s.linesearch:
                # backtracking on the step's own potential (inertia + elastic energy - load work + damper), not on the residual
                cx = (1-af)*bet*h*h; cv = (1-af)*gam*h; Cff = C[fr, fr]; Ms = 0.5*(M+M.T)
                def merit(at):
                    xa_, va_, aa_ = resid(at); ar = aa_.ravel(); vr = va_.ravel()[fr]
                    return 0.5*ar@(Ms@ar)/(1-am)+s.energy(xa_)/cx+0.5*vr@(Cff@vr)/cv-Fext.ravel()@at.ravel()
                m0 = merit(a1); slope = R@da.ravel(); lam = 1.0
                for ls in range(8):
                    at = a1.copy(); at[1:nf+1] += lam*da
                    if merit(at) <= m0+1e-4*lam*slope: break
                    lam *= 0.5
                a1 = at; s.nls = getattr(s, 'nls', 0)+ls
            else:
                a1[1:nf+1] += da
        x1 = xn+h*vn+h*h*((0.5-bet)*an+bet*a1)
        v1 = vn+h*((1-gam)*an+gam*a1)
        if not np.all(np.isfinite(x1)) or np.abs(x1).max() > 50 or np.abs(v1).max() > 300:
            s.blown = True; return
        s.wake_advance()
        s.Gam_prev = s.Gam.copy(); s.Vprev = vn
        s.X, s.V, s.Acc = x1, v1, a1
        s.t += h; s.step_i += 1
        _, T, Ts = s.struct(x1, want_K=False)
        s.Ts = Ts; s.T1 = T[0]; s.Tseg = T

def run(sim, sched, T, rec_hz=240, frame_hz=None):
    """sched(t)->sheet length. Records at rec_hz. Returns dict of arrays."""
    n = int(round(T/sim.h)); every = max(1, int(round(1/(rec_hz*sim.h))))
    fe = None if frame_hz is None else max(1, int(round(1/(frame_hz*sim.h))))
    out = dict(t=[], Ts=[], T1=[], X=[], Ls=[], G1=[], Tmax=[])
    frames = []; tsmax = 0.0
    for i in range(n):
        sim.step(sched(sim.t+0.6*sim.h))
        if sim.blown: break
        tsmax = max(tsmax, sim.Ts)
        if (i+1) % every == 0:
            out['t'].append(sim.t); out['Ts'].append(sim.Ts); out['T1'].append(sim.T1)
            out['X'].append(sim.X.copy()); out['Ls'].append(sim.Ls); out['G1'].append(sim.Gam[0])
            out['Tmax'].append(tsmax); tsmax = 0.0
        if fe and (i+1) % fe == 0:
            frames.append(dict(t=sim.t, X=sim.X.copy(), wP=sim.wakeP[-400:].copy(), wG=sim.wakeG[-400:].copy(), Ts=sim.Ts, Ls=sim.Ls))
    o = {k: np.array(v) for k, v in out.items()}
    o['blown'] = sim.blown; o['t_end'] = sim.t; o['frames'] = frames
    return o
