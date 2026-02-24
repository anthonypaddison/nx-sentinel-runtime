"""Websocket handlers for nx-displaygrid config storage."""
from __future__ import annotations

import logging
import json
from collections.abc import Mapping, Sequence
from typing import Any

import voluptuous as vol

from homeassistant.core import HomeAssistant
from homeassistant.components import websocket_api
from homeassistant.helpers.storage import Store

STORAGE_KEY = "nx_displaygrid.config"
STORAGE_VERSION = 1
REGISTERED_FLAG = "nx_displaygrid_ws_registered"
WS_TYPE_GET_CONFIG = "nx_displaygrid/config/get"
WS_TYPE_SET_CONFIG = "nx_displaygrid/config/set"
_LOGGER = logging.getLogger(__name__)
MAX_CONFIG_DEPTH = 8
MAX_CONFIG_ITEMS = 500
MAX_STRING_LENGTH = 4096
MAX_CONFIG_JSON_BYTES = 256 * 1024


def _sanitize_config_value(value: Any, *, depth: int = 0) -> Any:
    """Validate config payload shape and keep it JSON-safe for storage."""
    if depth > MAX_CONFIG_DEPTH:
        raise vol.Invalid("config nesting is too deep")

    if value is None or isinstance(value, (bool, int, float)):
        return value

    if isinstance(value, str):
        if len(value) > MAX_STRING_LENGTH:
            raise vol.Invalid("config string value is too long")
        return value

    if isinstance(value, Mapping):
        if len(value) > MAX_CONFIG_ITEMS:
            raise vol.Invalid("config object has too many keys")
        sanitized: dict[str, Any] = {}
        for key, item in value.items():
            if not isinstance(key, str):
                raise vol.Invalid("config object keys must be strings")
            if len(key) > 256:
                raise vol.Invalid("config object key is too long")
            sanitized[key] = _sanitize_config_value(item, depth=depth + 1)
        return sanitized

    if isinstance(value, Sequence) and not isinstance(value, (bytes, bytearray)):
        if len(value) > MAX_CONFIG_ITEMS:
            raise vol.Invalid("config list has too many items")
        return [_sanitize_config_value(item, depth=depth + 1) for item in value]

    raise vol.Invalid("config contains unsupported value type")


def _sanitize_config_payload(config: Any) -> dict[str, Any]:
    """Validate and normalize the stored shared config payload."""
    if config is None:
        return {}
    if not isinstance(config, dict):
        raise vol.Invalid("config must be an object")
    sanitized = _sanitize_config_value(config, depth=0)
    if not isinstance(sanitized, dict):
        raise vol.Invalid("config must be an object")
    # Guard against oversized writes to HA storage.
    encoded_size = len(
        json.dumps(sanitized, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    )
    if encoded_size > MAX_CONFIG_JSON_BYTES:
        raise vol.Invalid("config payload is too large")
    return sanitized


def _store(hass: HomeAssistant) -> Store:
    return Store(hass, STORAGE_VERSION, STORAGE_KEY)


@websocket_api.websocket_command({vol.Required("type"): WS_TYPE_GET_CONFIG})
@websocket_api.async_response
async def ws_get_config(hass: HomeAssistant, connection, msg: dict) -> None:
    """Return stored nx-displaygrid config."""
    config = await _store(hass).async_load()
    connection.send_result(msg["id"], {"config": config})


@websocket_api.websocket_command(
    {vol.Required("type"): WS_TYPE_SET_CONFIG, vol.Required("config"): dict}
)
@websocket_api.require_admin
@websocket_api.async_response
async def ws_set_config(hass: HomeAssistant, connection, msg: dict) -> None:
    """Save nx-displaygrid config."""
    try:
        config = _sanitize_config_payload(msg.get("config"))
    except vol.Invalid as err:
        connection.send_error(msg["id"], "invalid_format", str(err))
        return
    await _store(hass).async_save(config)
    connection.send_result(msg["id"], {"ok": True})


def async_register_ws(hass: HomeAssistant) -> None:
    """Register websocket commands."""
    if hass.data.get(REGISTERED_FLAG):
        return
    websocket_api.async_register_command(hass, ws_get_config)
    websocket_api.async_register_command(hass, ws_set_config)
    hass.data[REGISTERED_FLAG] = True
    _LOGGER.info(
        "nx_displaygrid: websocket commands registered: %s, %s",
        WS_TYPE_GET_CONFIG,
        WS_TYPE_SET_CONFIG,
    )
