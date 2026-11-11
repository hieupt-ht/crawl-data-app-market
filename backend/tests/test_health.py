"""Kiểm tra endpoint health — extension gọi để biết Django đã bật chưa."""


def test_health_returns_ok(client):
    response = client.get("/api/health/")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
