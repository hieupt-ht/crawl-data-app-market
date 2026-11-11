"""
Test API công ty và tài khoản developer — phục vụ popup "Tài khoản này thuộc công ty nào?" của extension.
"""

from market.models import Company, DeveloperAccount


def post_assignment(client, body: dict):
    """Gửi POST /api/developer-accounts/ dạng JSON (giống extension gửi)."""
    return client.post("/api/developer-accounts/", body, content_type="application/json")


def test_get_unknown_developer_404(client, db):
    response = client.get("/api/developer-accounts/abc/")
    assert response.status_code == 404
    assert response.json() == {"detail": "Chưa biết tài khoản developer này."}


def test_get_known_developer(client, make_developer):
    make_developer(play_developer_id="123", display_name="Apero Technologies Group")
    response = client.get("/api/developer-accounts/123/")
    assert response.status_code == 200
    assert response.json() == {
        "play_developer_id": "123",
        "display_name": "Apero Technologies Group",
        "status": "assigned",
        "company": {"id": "apero", "name": "Apero"},
    }


def test_assign_to_new_company(client, db):
    response = post_assignment(
        client, {"play_developer_id": "123", "display_name": "PDF Reader Studio", "new_company_name": "Apero"}
    )
    assert response.status_code == 200
    assert response.json()["status"] == "assigned"
    assert response.json()["company"] == {"id": "apero", "name": "Apero"}
    assert Company.objects.get(id="apero").is_vietnamese is True


def test_new_company_name_reuses_existing_slug(client, make_company):
    make_company(id="apero", name="Apero")
    response = post_assignment(
        client, {"play_developer_id": "456", "display_name": "Apero 2", "new_company_name": "apero"}
    )
    assert response.status_code == 200
    assert response.json()["company"] == {"id": "apero", "name": "Apero"}
    assert Company.objects.count() == 1


def test_mark_foreign(client, db):
    response = post_assignment(client, {"play_developer_id": "adobe", "display_name": "Adobe", "foreign": True})
    assert response.status_code == 200
    assert response.json()["status"] == "foreign"
    assert response.json()["company"] is None


def test_assign_existing_company(client, make_company):
    make_company(id="ikame", name="iKame")
    response = post_assignment(
        client, {"play_developer_id": "789", "display_name": "iKame Global", "company_id": "ikame"}
    )
    assert response.status_code == 200
    assert response.json()["company"] == {"id": "ikame", "name": "iKame"}


def test_reassign_updates_existing_account(client, make_developer, make_company):
    make_developer(play_developer_id="789", status="unassigned", company=None)
    make_company(id="ikame", name="iKame")
    post_assignment(client, {"play_developer_id": "789", "display_name": "Tên mới", "company_id": "ikame"})
    developer = DeveloperAccount.objects.get(play_developer_id="789")
    assert developer.status == "assigned"
    assert developer.company_id == "ikame"
    assert developer.display_name == "Tên mới"


def test_reject_two_choices(client, make_company):
    make_company(id="apero")
    response = post_assignment(
        client, {"play_developer_id": "1", "display_name": "X", "company_id": "apero", "foreign": True}
    )
    assert response.status_code == 400
    assert DeveloperAccount.objects.count() == 0


def test_reject_no_choice(client, db):
    response = post_assignment(client, {"play_developer_id": "1", "display_name": "X"})
    assert response.status_code == 400


def test_reject_unknown_company_id(client, db):
    response = post_assignment(client, {"play_developer_id": "1", "display_name": "X", "company_id": "khong-co"})
    assert response.status_code == 400


def test_list_companies_sorted(client, make_company):
    make_company(id="rooster-x", name="RoosterX")
    make_company(id="apero", name="Apero")
    make_company(id="ikame", name="iKame")
    response = client.get("/api/companies/")
    assert response.status_code == 200
    names = [company["name"] for company in response.json()]
    assert names == ["Apero", "iKame", "RoosterX"]
    assert set(response.json()[0].keys()) == {"id", "name", "is_vietnamese"}
