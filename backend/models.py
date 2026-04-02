from sqlalchemy import Column, Integer, String, Float, Boolean, BigInteger, ForeignKey
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


class DailyTurnState(Base):
    __tablename__ = "daily_turn_states"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    work_date = Column(String, nullable=False, index=True)  # ví dụ: "20260401"

    checked_in = Column(Boolean, default=False)
    check_in_order = Column(Integer, nullable=True)

    in_progress = Column(Boolean, default=False)
    started_at = Column(BigInteger, nullable=True)  # Date.now() từ frontend

    appointment_mode = Column(Boolean, default=False)
    bonus_mode = Column(Boolean, default=False)
    bonus_input = Column(String, default="")

    bonus_amount = Column(Integer, default=0)
    turn_points = Column(Integer, default=0)


class DailyTurnHistory(Base):
    __tablename__ = "daily_turn_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    username_snapshot = Column(String, nullable=False)

    work_date = Column(String, nullable=False, index=True)

    final_checked_in = Column(Boolean, default=False)
    final_check_in_order = Column(Integer, nullable=True)
    final_in_progress = Column(Boolean, default=False)
    final_started_at = Column(BigInteger, nullable=True)

    final_appointment_mode = Column(Boolean, default=False)
    final_bonus_mode = Column(Boolean, default=False)
    final_bonus_input = Column(String, default="")

    final_bonus_amount = Column(Integer, default=0)
    final_turn_points = Column(Integer, default=0)