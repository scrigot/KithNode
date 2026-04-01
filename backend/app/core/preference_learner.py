"""Lift-factor preference learning for signal-training.

Algorithm:
  For each (dimension, feature):
    lift = P(feature | high_value) / P(feature | all_rated)
    Capped to [0.2, 3.0]

Activates after 10+ total ratings with 3+ high_value.
"""

from __future__ import annotations

import database as db
from feature_extractor import extract_features

MINIMUM_TOTAL_RATINGS = 10
MINIMUM_HIGH_VALUE = 3
MAX_LIFT = 3.0
MIN_LIFT = 0.2


def can_learn() -> bool:
    """Check if we have enough ratings to activate learning."""
    summary = db.get_ratings_summary()
    return (
        summary["total"] >= MINIMUM_TOTAL_RATINGS
        and summary["high_value"] >= MINIMUM_HIGH_VALUE
    )


def compute_lift_factors() -> dict[str, dict[str, float]]:
    """Compute lift factors for all dimension/feature pairs from rating data.

    Returns: {dimension: {feature: lift_factor}}
    """
    if not can_learn():
        return {}

    all_rated = db.get_rated_contacts()
    high_value = [c for c in all_rated if c["rating"] == "high_value"]

    total_all = len(all_rated)
    total_hv = len(high_value)

    if total_all == 0 or total_hv == 0:
        return {}

    # Count feature occurrences
    all_counts: dict[str, dict[str, int]] = {}
    hv_counts: dict[str, dict[str, int]] = {}

    for contact in all_rated:
        features = extract_features(contact)
        for dimension, feature_list in features.items():
            if dimension not in all_counts:
                all_counts[dimension] = {}
            for feature in feature_list:
                all_counts[dimension][feature] = all_counts[dimension].get(feature, 0) + 1

    for contact in high_value:
        features = extract_features(contact)
        for dimension, feature_list in features.items():
            if dimension not in hv_counts:
                hv_counts[dimension] = {}
            for feature in feature_list:
                hv_counts[dimension][feature] = hv_counts[dimension].get(feature, 0) + 1

    # Compute lift = P(feature|hv) / P(feature|all)
    lifts: dict[str, dict[str, float]] = {}
    for dimension, features in all_counts.items():
        lifts[dimension] = {}
        for feature, all_count in features.items():
            hv_count = hv_counts.get(dimension, {}).get(feature, 0)
            p_hv = hv_count / total_hv
            p_all = all_count / total_all

            lift = (p_hv / p_all) if p_all > 0 else 1.0
            lift = max(MIN_LIFT, min(MAX_LIFT, lift))
            lifts[dimension][feature] = round(lift, 3)

    return lifts


def recalculate_and_save() -> dict:
    """Recompute all lift factors and persist them."""
    lifts = compute_lift_factors()
    weights_updated = 0

    if lifts:
        all_rated = db.get_rated_contacts()
        for dimension, features in lifts.items():
            for feature, lift_factor in features.items():
                # Count how many rated contacts have this feature
                count = 0
                for c in all_rated:
                    feats = extract_features(c)
                    if feature in feats.get(dimension, []):
                        count += 1
                db.save_learned_weight(dimension, feature, lift_factor, count)
                weights_updated += 1

    return {
        "learning_active": bool(lifts),
        "weights_updated": weights_updated,
    }
