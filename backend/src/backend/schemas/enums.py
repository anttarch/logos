from enum import Enum


class IncidentCategory(str, Enum):
    VEHICLE_ACCIDENT = "VEHICLE_ACCIDENT"  # Acidente com Veículo
    VICTIM_ACCIDENT = "VICTIM_ACCIDENT"  # Acidente com Vítimas
    WEIRD_WEATHER_CONDITION = (
        "WEIRD_WEATHER_CONDITION"  # Condição Climática Atípica na Pista
    )
    MECHANICAL_ISSUE = "MECHANICAL_ISSUE"  # Problema Mecânico
    ROAD_BLOCK = "ROAD_BLOCK"  # Bloqueio de Pista


class IncidentStatus(str, Enum):
    OPEN = "OPEN"  # Aberto
    CLOSED = "CLOSED"  # Fechado
    UNDER_INVESTIGATION = "UNDER_INVESTIGATION"  # Em Investigação
    INCONCLUSIVE = "INCONCLUSIVE"  # Inconclusivo


class IncidentCriticality(str, Enum):
    HIGH = "HIGH"  # Alta
    MEDIUM = "MEDIUM"  # Média
    LOW = "LOW"  # Baixa
