# This file makes the backend directory a Python package
from .database import Base, get_db
from .models import Config
from .schemas import ConfigBase, ConfigCreate, Config as ConfigSchema
