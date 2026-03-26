from sqlalchemy import Column, Integer, String, Float, Boolean
from database import Base

class NailColor(Base):
    __tablename__ = "nail_colors"

    id = Column(Integer, primary_key=True, index=True)
    brand = Column(String, nullable=False)
    name = Column(String, nullable=False)
    hex = Column(String, nullable=False)

    r = Column(Integer)
    g = Column(Integer)
    b = Column(Integer)

    lab_l = Column(Float)
    lab_a = Column(Float)
    lab_b = Column(Float)

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, nullable=False)
    password = Column(String, nullable=False)
    role = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)