#!/usr/bin/env python3
"""
RadioML 2016.10A Dataset Preprocessor for DigiCommLab

Extracts dataset metadata, class counts, SNR distributions, and representative
I/Q continuous waveforms from the original RML2016.10a_dict.pkl dataset
and writes a lightweight static summary to public/data/radioml_summary.json.

Usage:
    python scripts/prepare_radioml.py --input /path/to/RML2016.10a_dict.pkl
    python scripts/prepare_radioml.py -i ./data/RML2016.10a_dict.pkl -o public/data/radioml_summary.json
"""

import argparse
import json
import os
import pickle
import sys
from collections import Counter
from pathlib import Path


def parse_args():
    parser = argparse.ArgumentParser(
        description="Extract statistical summary and representative waveforms from RadioML 2016.10A pickle dataset."
    )
    parser.add_argument(
        "--input",
        "-i",
        type=Path,
        default=Path("data/RML2016.10a_dict.pkl"),
        help="Path to the RML2016.10a_dict.pkl dataset file (default: data/RML2016.10a_dict.pkl)",
    )
    parser.add_argument(
        "--output",
        "-o",
        type=Path,
        default=Path("public/data/radioml_summary.json"),
        help="Path to save the summary JSON (default: public/data/radioml_summary.json)",
    )
    return parser.parse_args()


def main():
    args = parse_args()
    dataset_path = args.input
    output_path = args.output

    if not dataset_path.is_file():
        print(f"Error: Dataset file not found at '{dataset_path}'", file=sys.stderr)
        print("Please provide the correct path using: python scripts/prepare_radioml.py --input <path_to_pkl>", file=sys.stderr)
        print("Dataset can be obtained from DeepSig RadioML 2016.10A archive.", file=sys.stderr)
        sys.exit(1)

    print(f"Loading RadioML dataset from: {dataset_path}")
    with dataset_path.open("rb") as file:
        dataset = pickle.load(file, encoding="bytes")

    modulation_counts = Counter()
    snr_counts = Counter()
    samples_by_modulation_snr = {}

    # Gather real counts from the dataset
    for (modulation_bytes, snr), samples in dataset.items():
        modulation = modulation_bytes.decode("utf-8") if isinstance(modulation_bytes, (bytes, bytearray)) else str(modulation_bytes)
        count = len(samples)

        modulation_counts[modulation] += count
        snr_counts[snr] += count
        samples_by_modulation_snr[(modulation, snr)] = count

    # Select real representative I/Q samples at -4, 0, and 10 dB
    representative_samples = {}
    for modulation in sorted(modulation_counts):
        representative_samples[modulation] = {}

        for snr in (-4, 0, 10):
            # Try both bytes and string keys
            key = (modulation.encode("utf-8"), snr)
            if key not in dataset:
                key = (modulation, snr)
                if key not in dataset:
                    continue

            # Shape: (2, 128), where channel 0 is I and channel 1 is Q
            sample = dataset[key][0]

            representative_samples[modulation][str(snr)] = {
                "I": sample[0].astype(float).round(6).tolist(),
                "Q": sample[1].astype(float).round(6).tolist(),
            }

    summary = {
        "dataset": "RadioML 2016.10A",
        "totalSamples": sum(modulation_counts.values()),
        "sampleShape": [2, 128],
        "modulationCounts": dict(sorted(modulation_counts.items())),
        "snrCounts": {
            str(snr): snr_counts[snr]
            for snr in sorted(snr_counts)
        },
        "samplesPerModulationSNR": {
            f"{modulation}|{snr}": count
            for (modulation, snr), count
            in sorted(samples_by_modulation_snr.items())
        },
        "representativeSamples": representative_samples,
    }

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(
        json.dumps(summary, separators=(",", ":")),
        encoding="utf-8",
    )

    print("Successfully generated summary JSON:")
    print(f"  - Total samples: {summary['totalSamples']:,}")
    print(f"  - Modulation classes: {len(modulation_counts)}")
    print(f"  - SNR levels: {len(snr_counts)}")
    print(f"  - Destination: {output_path.resolve()}")
    print(f"  - File size: {output_path.stat().st_size / 1024:.1f} KB")


if __name__ == "__main__":
    main()
