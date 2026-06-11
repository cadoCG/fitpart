"""Tests der FastAPI-Endpoints."""

from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_list_templates_contains_spacer():
    r = client.get("/templates")
    assert r.status_code == 200
    archetypes = [t["archetype"] for t in r.json()]
    assert "spacer" in archetypes


def test_generate_stl():
    r = client.post(
        "/generate",
        json={
            "archetype": "spacer",
            "params": {"inner_d": 5.0, "outer_d": 10.0, "height": 8.0},
            "format": "stl",
        },
    )
    assert r.status_code == 200
    assert r.headers["content-type"] == "model/stl"
    assert len(r.content) > 84  # STL-Header + mind. ein Dreieck


def test_generate_3mf_with_recommendation():
    r = client.post(
        "/generate",
        json={
            "archetype": "spacer",
            "params": {"inner_d": 5.0, "outer_d": 10.0, "height": 8.0},
            "format": "3mf",
        },
    )
    assert r.status_code == 200
    assert r.headers["content-type"] == "model/3mf"


def test_generate_unknown_archetype():
    r = client.post(
        "/generate",
        json={"archetype": "nope", "params": {}},
    )
    assert r.status_code == 404


def test_calibration_ladders():
    r = client.get("/calibration/ladders")
    assert r.status_code == 200
    body = r.json()
    assert body["hole_mm"] == [4.8, 4.9, 5.0, 5.1, 5.2, 5.4, 5.6]
    assert body["reference_pin_mm"] == 5.0


def test_calibration_profile():
    r = client.post(
        "/calibration/profile",
        json={"snug_hole_mm": 5.2, "snug_shaft_mm": 4.8, "nozzle_mm": 0.4},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["hole_offset_mm"] == 0.2
    assert body["shaft_offset_mm"] == 0.2
    assert body["calibrated"] is True


def test_generate_calibration_coupon():
    r = client.post(
        "/generate",
        json={"archetype": "calibration_coupon", "params": {"labels": False}, "format": "stl"},
    )
    assert r.status_code == 200
    assert r.headers["content-type"] == "model/stl"


def test_generate_invalid_params():
    r = client.post(
        "/generate",
        json={
            "archetype": "spacer",
            "params": {"inner_d": 5.0, "outer_d": 6.0, "height": 8.0},
        },
    )
    assert r.status_code == 422
