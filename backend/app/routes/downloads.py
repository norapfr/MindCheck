from fastapi import APIRouter, Depends, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from sqlalchemy.orm import Session

from app.database import get_db, AppDownload
from app.limiter import limiter

router = APIRouter()

APK_URL = "https://github.com/norapfr/MindCheck/releases/latest/download/mindcheck.apk"


def _render_landing(count: int) -> str:
    petals = [
        (5, 18, 7, 0),
        (12, 12, 10, 2),
        (20, 22, 8, 4),
        (28, 10, 12, 1),
        (36, 16, 9, 5),
        (44, 8, 11, 3),
        (52, 20, 7, 7),
        (60, 13, 10, 2),
        (68, 9, 13, 6),
        (76, 18, 8, 4),
        (84, 11, 11, 0),
        (92, 21, 9, 8),
        (15, 7, 14, 5),
        (25, 15, 9, 9),
        (47, 12, 12, 6),
        (57, 7, 10, 10),
        (72, 14, 14, 3),
        (88, 8, 8, 7),
    ]

    petal_html = "".join(
        f'''
        <span
            class="petal"
            style="
                --left:{left}%;
                --size:{size}px;
                --duration:{duration}s;
                --delay:{delay}s;
                --drift:{drift}px;
            "
        ></span>
        '''
        for left, size, duration, delay in petals
        for drift in [
            (-1 if left % 2 else 1) * (20 + (left * 3 % 45))
        ]
    )

    plural = "download" if count == 1 else "downloads"

    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="theme-color" content="#FFF7F9" />

<title>MindCheck — Private Mood Journal</title>

<style>
    * {{
        box-sizing: border-box;
    }}

    html,
    body {{
        margin: 0;
        padding: 0;
        min-height: 100%;
    }}

    body {{
        min-height: 100vh;

        display: flex;
        align-items: center;
        justify-content: center;

        padding: 40px 0;

        background:
            radial-gradient(
                circle at 10% 10%,
                rgba(255, 196, 216, 0.35),
                transparent 30%
            ),
            radial-gradient(
                circle at 90% 85%,
                rgba(255, 215, 226, 0.4),
                transparent 30%
            ),
            #FFF7F9;

        color: #3A2530;

        font-family:
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            Roboto,
            Helvetica,
            Arial,
            sans-serif;

        overflow-x: hidden;
    }}

    /* ================================
       Sakura petals
       ================================ */

    .sakura {{
        position: fixed;
        inset: 0;

        pointer-events: none;
        overflow: hidden;

        z-index: 0;
    }}

    .petal {{
        position: absolute;

        top: -60px;
        left: var(--left);

        width: var(--size);
        height: calc(var(--size) * 0.72);

        background: linear-gradient(
            135deg,
            #FFD9E7 0%,
            #F7A9C5 55%,
            #E889AA 100%
        );

        border-radius:
            100% 0
            100% 0;

        opacity: 0;

        filter:
            drop-shadow(
                0 2px 3px rgba(170, 80, 110, 0.12)
            );

        animation:
            fall var(--duration) linear var(--delay) infinite,
            sway 3.5s ease-in-out var(--delay) infinite alternate;
    }}

    .petal::after {{
        content: "";

        position: absolute;

        width: 35%;
        height: 35%;

        left: 50%;
        top: 50%;

        transform: translate(-50%, -50%);

        background: rgba(255, 255, 255, 0.45);

        border-radius: 50%;
    }}

    @keyframes fall {{
        0% {{
            transform:
                translate3d(0, -80px, 0)
                rotate(0deg);
            opacity: 0;
        }}

        8% {{
            opacity: 0.85;
        }}

        25% {{
            transform:
                translate3d(
                    calc(var(--drift) * 0.25),
                    25vh,
                    0
                )
                rotate(100deg);
        }}

        50% {{
            transform:
                translate3d(
                    calc(var(--drift) * -0.35),
                    50vh,
                    0
                )
                rotate(220deg);
        }}

        75% {{
            transform:
                translate3d(
                    calc(var(--drift) * 0.55),
                    75vh,
                    0
                )
                rotate(310deg);
        }}

        92% {{
            opacity: 0.7;
        }}

        100% {{
            transform:
                translate3d(
                    var(--drift),
                    115vh,
                    0
                )
                rotate(430deg);

            opacity: 0;
        }}
    }}

    @keyframes sway {{
        0% {{
            margin-left: -12px;
        }}

        100% {{
            margin-left: 12px;
        }}
    }}

    /* ================================
       Main container
       ================================ */

    .page {{
        position: relative;
        z-index: 2;

        width: min(680px, calc(100% - 28px));

        display: flex;
        flex-direction: column;
        align-items: center;
    }}

    .card {{
        width: 100%;

        text-align: center;

        background: rgba(255, 255, 255, 0.95);

        border: 1px solid #F5D9E3;
        border-radius: 26px;

        padding: 44px 34px 36px;

        box-shadow:
            0 24px 70px rgba(180, 100, 125, 0.12),
            0 5px 24px rgba(0, 0, 0, 0.04);

        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
    }}

    /* ================================
       Hero
       ================================ */

    .logo {{
        font-size: 44px;
        line-height: 1;

        margin-bottom: 14px;

        animation:
            gentleFloat 4s ease-in-out infinite;
    }}

    @keyframes gentleFloat {{
        0%, 100% {{
            transform: translateY(0);
        }}

        50% {{
            transform: translateY(-5px);
        }}
    }}

    h1 {{
        font-size: 32px;
        line-height: 1.15;

        margin: 0 0 8px;

        color: #D45C82;

        letter-spacing: -0.7px;
    }}

    .tagline {{
        font-size: 15px;
        line-height: 1.5;

        color: #9C8790;

        margin-bottom: 28px;
    }}

    /* ================================
       Download
       ================================ */

    .download-btn {{
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 10px;

        background: #E97CA0;
        color: #FFFFFF;

        text-decoration: none;

        font-weight: 650;
        font-size: 16px;

        padding: 15px 34px;

        border-radius: 14px;

        box-shadow:
            0 8px 22px rgba(233, 124, 160, 0.25);

        transition:
            transform 0.2s ease,
            background 0.2s ease,
            box-shadow 0.2s ease;
    }}

    .download-btn:hover {{
        background: #D9668D;

        transform: translateY(-2px);

        box-shadow:
            0 11px 28px rgba(233, 124, 160, 0.34);
    }}

    .download-btn:active {{
        background: #D45C82;
        transform: translateY(0);
    }}

    .download-icon {{
        font-size: 20px;
        line-height: 1;
    }}

    .count {{
        font-size: 12px;

        color: #A18D95;

        margin-top: 14px;
    }}

    /* ================================
       About
       ================================ */

    .about {{
        margin-top: 34px;

        padding-top: 30px;

        border-top: 1px solid #F5DDE5;
    }}

    .about h2 {{
        margin: 0 0 12px;

        font-size: 20px;

        color: #D45C82;
    }}

    .about-text {{
        margin: 0 auto;

        max-width: 570px;

        font-size: 14px;
        line-height: 1.75;

        color: #735E67;
    }}

    /* ================================
       Features
       ================================ */

    .features {{
        display: grid;

        grid-template-columns:
            repeat(2, minmax(0, 1fr));

        gap: 12px;

        margin-top: 24px;

        text-align: left;
    }}

    .feature {{
        padding: 17px;

        background: #FFF8FA;

        border: 1px solid #F7E0E7;

        border-radius: 16px;

        transition:
            transform 0.2s ease,
            box-shadow 0.2s ease;
    }}

    .feature:hover {{
        transform: translateY(-2px);

        box-shadow:
            0 7px 18px rgba(180, 100, 125, 0.08);
    }}

    .feature-icon {{
        font-size: 23px;

        margin-bottom: 7px;
    }}

    .feature-title {{
        font-size: 13px;
        font-weight: 650;

        color: #4A3540;

        margin-bottom: 5px;
    }}

    .feature-text {{
        font-size: 12px;
        line-height: 1.55;

        color: #927C85;
    }}

    /* ================================
       Privacy note
       ================================ */

    .privacy {{
        margin-top: 24px;

        padding: 17px 18px;

        background: #FFF1F5;

        border: 1px solid #F5D6E1;

        border-radius: 15px;

        font-size: 12px;
        line-height: 1.65;

        color: #805F6C;
    }}

    .privacy strong {{
        color: #D45C82;
    }}

    /* ================================
       Safety notice
       ================================ */

    .safety {{
        margin-top: 18px;

        font-size: 11px;
        line-height: 1.6;

        color: #A18D95;
    }}

    /* ================================
       Footer
       ================================ */

    .footer {{
        margin-top: 18px;

        font-size: 11px;

        color: #B39EA7;

        text-align: center;
    }}

    /* ================================
       Mobile
       ================================ */

    @media (max-width: 560px) {{
        body {{
            align-items: flex-start;
        }}

        .page {{
            margin: 20px 0;
        }}

        .card {{
            padding: 34px 20px 28px;

            border-radius: 22px;
        }}

        h1 {{
            font-size: 28px;
        }}

        .tagline {{
            font-size: 14px;
        }}

        .download-btn {{
            width: 100%;
        }}

        .features {{
            grid-template-columns: 1fr;
        }}

        .about-text {{
            font-size: 13px;
        }}
    }}

    /* ================================
       Reduced motion
       ================================ */

    @media (prefers-reduced-motion: reduce) {{
        .petal,
        .logo {{
            animation: none;
        }}

        .download-btn,
        .feature {{
            transition: none;
        }}
    }}
</style>
</head>

<body>

<!-- Falling sakura -->
<div class="sakura">
    {petal_html}
</div>

<main class="page">

    <section class="card">

        <div class="logo">🌸🧠</div>

        <h1>MindCheck</h1>

        <div class="tagline">
            A private, on-device mood journal
        </div>

        <a class="download-btn" href="/download">
            <span class="download-icon">↓</span>
            Download APK
        </a>

        <div class="count">
            {count} {plural} so far
        </div>


        <!-- About -->
        <section class="about">

            <h2>A little space to check in with yourself</h2>

            <p class="about-text">
                MindCheck is a gentle journaling app designed to help you
                notice patterns in how you feel over time. Write about your
                day in your own words, keep track of your mood, and use the
                app's on-device analysis as an additional way to reflect
                on your emotional wellbeing.
            </p>

        </section>


        <!-- Features -->
        <section class="features">

            <div class="feature">
                <div class="feature-icon">📓</div>

                <div class="feature-title">
                    Daily journaling
                </div>

                <div class="feature-text">
                    Write freely with gentle prompts and keep a day-to-day
                    journaling streak.
                </div>
            </div>


            <div class="feature">
                <div class="feature-icon">🧠</div>

                <div class="feature-title">
                    On-device analysis
                </div>

                <div class="feature-text">
                    Risk analysis runs locally on your phone using BERT
                    and lightweight ML models.
                </div>
            </div>


            <div class="feature">
                <div class="feature-icon">📈</div>

                <div class="feature-title">
                    Mood history
                </div>

                <div class="feature-text">
                    Look back over time with mood trends, date filters,
                    and individual journal entries.
                </div>
            </div>


            <div class="feature">
                <div class="feature-icon">🔐</div>

                <div class="feature-title">
                    Privacy by design
                </div>

                <div class="feature-text">
                    Journal content is encrypted at rest, with options
                    to export or permanently delete your data.
                </div>
            </div>

        </section>


        <!-- Privacy -->
        <div class="privacy">
            <strong>Your journal stays personal.</strong>
            The ML analysis is performed directly on your device,
            so the raw journal text does not need to be sent to a
            cloud AI model to produce its risk scores.
        </div>


        <!-- Safety -->
        <div class="safety">
            MindCheck is a self-awareness and emotional support tool.
            It does not diagnose medical conditions and does not replace
            professional help. If you or someone you know is struggling,
            please reach out to a crisis line or a mental health professional.
        </div>


        <!-- Download note -->
        <div class="about" style="margin-top: 26px; padding-top: 24px;">

            <p class="about-text" style="font-size: 12px;">
                <strong style="color: #D45C82;">
                    Android only.
                </strong>
                When installing, your phone may ask you to allow
                "unknown sources" — this is normal for apps shared
                outside Google Play.
            </p>

        </div>

    </section>


    <div class="footer">
        Made with 💗 for a calmer digital space
    </div>

</main>

</body>
</html>"""


@router.get("/", response_class=HTMLResponse)
def landing_page(db: Session = Depends(get_db)):
    count = db.query(AppDownload).count()
    return HTMLResponse(_render_landing(count))


@router.get("/download")
@limiter.limit("10/minute")
def download_apk(request: Request, db: Session = Depends(get_db)):
    db.add(AppDownload())
    db.commit()

    return RedirectResponse(
        url=APK_URL,
        status_code=307,
    )

