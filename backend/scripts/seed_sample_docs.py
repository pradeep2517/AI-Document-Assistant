import os
import sys
from pathlib import Path
import fitz

base_dir = Path(__file__).resolve().parent.parent
sample_dir = base_dir.parent / "sample_documents"
sample_dir.mkdir(parents=True, exist_ok=True)


def create_renewable_energy_pdf():
    pdf_path = sample_dir / "The Future of Renewable Energy.pdf"
    if pdf_path.exists():
        return str(pdf_path)

    doc = fitz.open()

    # Page 1: Executive Overview & Abstract
    p1 = doc.new_page()
    p1.insert_text(
        (54, 72),
        "The Future of Renewable Energy: Grid Modernization & Machine Learning\n"
        "Strategic Technology Assessment Report\n\n"
        "Abstract\n"
        "Contrastive learning and deep neural networks have emerged as powerful frameworks for modeling\n"
        "power grid resilience and renewable energy fluctuations. This research explores photovoltaic\n"
        "power forecasting, wind generation dynamics, and grid-scale battery storage strategies.\n\n"
        "1. Executive Summary\n"
        "Global transition to zero-carbon grids requires high-frequency forecasting and autonomous load\n"
        "balancing. Traditional numerical weather models exhibit latency bottlenecks of up to 4 hours.\n"
        "Deep temporal models reduce forecast deviation by over 24%, enabling proactive storage dispatch\n"
        "and curtailment avoidance across distributed power networks.\n\n"
        "Key Innovations Highlighted:\n"
        "• Dual-branch spatial-temporal transformers for solar irradiance forecasting.\n"
        "• Dynamic battery storage management with sub-second response times.\n"
        "• pgvector-backed telemetry embeddings for microgrid stability classification.",
        fontsize=11
    )

    # Page 2: Architecture and Methodology
    p2 = doc.new_page()
    p2.insert_text(
        (54, 72),
        "2. System Architecture & Methodology\n\n"
        "2.1 Telemetry Sensor Network\n"
        "The distributed sensor network continuously ingests phase angle, frequency, and active power\n"
        "at 60 Hz sampling rates from 144 phasor measurement units (PMUs). The data stream is\n"
        "partitioned into rolling 15-minute observation windows.\n\n"
        "2.2 Contrastive Embedding Generation\n"
        "Telemetry windows are mapped into a 384-dimensional dense latent space using a self-supervised\n"
        "encoder trained on 10 million historical telemetry sequences. Cosine similarity in this\n"
        "embedding space corresponds directly to voltage stability margins.\n\n"
        "2.3 Predictive Control Loop\n"
        "When similarity scores drop below 0.35 against nominal grid archetypes, an automated reserve\n"
        "injection command is dispatched to local battery energy storage systems (BESS).",
        fontsize=11
    )

    # Page 3: Experimental Validation & Performance
    p3 = doc.new_page()
    p3.insert_text(
        (54, 72),
        "3. Experimental Validation\n\n"
        "3.1 Microgrid Benchmark Results\n"
        "Field evaluations across 12 commercial microgrids demonstrated significant gains:\n"
        "• Root Mean Square Error (RMSE): 0.042 (down from 0.078 in baseline ARIMA models).\n"
        "• Mean Absolute Error (MAE): 0.031.\n"
        "• Battery Lifecycle Improvement: 18.4% degradation reduction through peak-smoothing.\n\n"
        "3.2 Economic and Environmental Impact\n"
        "The deployment realized an average annual cost savings of $340,000 per facility through\n"
        "peak-demand charge avoidance and wholesale tariff arbitrage. Annual carbon emissions\n"
        "decreased by 1,420 metric tons CO2 equivalent.",
        fontsize=11
    )

    doc.save(str(pdf_path))
    doc.close()
    print(f"Created sample PDF: {pdf_path}")
    return str(pdf_path)


def create_cbt_guide_pdf():
    pdf_path = sample_dir / "Cognitive Behavioral Therapy.pdf"
    if pdf_path.exists():
        return str(pdf_path)

    doc = fitz.open()

    # Page 1
    p1 = doc.new_page()
    p1.insert_text(
        (54, 72),
        "Cognitive Behavioral Therapy: Clinical Protocols & Behavioral Interventions\n"
        "Practitioner Reference Handbook\n\n"
        "1. Core Principles of CBT\n"
        "Cognitive Behavioral Therapy (CBT) operates on the empirically verified premise that cognitive\n"
        "appraisals directly influence emotional and behavioral responses. Dysfunctional thinking is common\n"
        "to all psychological disturbances.\n\n"
        "1.1 The Cognitive Triad\n"
        "Aaron Beck formulated the cognitive triad: negative views about the self, the world/environment,\n"
        "and the future. Systematic cognitive restructuring trains individuals to identify automatic\n"
        "thoughts and subject them to evidence-based evaluation.",
        fontsize=11
    )

    # Page 2
    p2 = doc.new_page()
    p2.insert_text(
        (54, 72),
        "2. Structured Interventions\n\n"
        "2.1 Thought Records (Dysfunctional Thought Record - DTR)\n"
        "Clients track triggering situations, automatic thoughts, underlying emotions (rated 0-100),\n"
        "evidence supporting the thought, evidence contradicting the thought, alternative balanced\n"
        "thoughts, and post-intervention emotion ratings.\n\n"
        "2.2 Behavioral Experiments\n"
        "Unlike purely reflective discussion, behavioral experiments provide real-world testing grounds\n"
        "to challenge catastrophic predictions. Hypotheses are explicitly written prior to the task.",
        fontsize=11
    )

    doc.save(str(pdf_path))
    doc.close()
    print(f"Created sample PDF: {pdf_path}")
    return str(pdf_path)


if __name__ == "__main__":
    create_renewable_energy_pdf()
    create_cbt_guide_pdf()
