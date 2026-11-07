import pytest
from jwt import InvalidTokenError

from app.core.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)


def test_password_hash_verifies_only_matching_password():
    hashed_password = hash_password("correct-horse-123")

    assert hashed_password != "correct-horse-123"
    assert verify_password("correct-horse-123", hashed_password)
    assert not verify_password("wrong-password", hashed_password)


def test_access_token_round_trip_preserves_user_id():
    token = create_access_token(42)

    assert decode_access_token(token) == 42


def test_access_token_rejects_invalid_signature():
    token = create_access_token(42)

    with pytest.raises(InvalidTokenError):
        decode_access_token(f"{token}invalid")
