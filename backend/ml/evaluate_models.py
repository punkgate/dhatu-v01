"""Reusable evaluation helpers for synthetic-data ML baselines."""

import numpy as np
from sklearn.metrics import accuracy_score, confusion_matrix, f1_score, mean_absolute_error, mean_squared_error, precision_score, r2_score, recall_score, roc_auc_score


def regression_metrics(actual: np.ndarray, predicted: np.ndarray, targets: list[str]) -> dict[str, dict[str, float]]:
    return {target: {"mae": float(mean_absolute_error(actual[:, index], predicted[:, index])), "rmse": float(mean_squared_error(actual[:, index], predicted[:, index]) ** 0.5), "r2": float(r2_score(actual[:, index], predicted[:, index]))} for index, target in enumerate(targets)}


def classifier_metrics(actual: np.ndarray, predicted: np.ndarray, probabilities: np.ndarray) -> dict[str, object]:
    return {"precision": float(precision_score(actual, predicted, zero_division=0)), "recall": float(recall_score(actual, predicted, zero_division=0)), "f1": float(f1_score(actual, predicted, zero_division=0)), "roc_auc": float(roc_auc_score(actual, probabilities)), "accuracy": float(accuracy_score(actual, predicted)), "confusion_matrix": confusion_matrix(actual, predicted).tolist()}
