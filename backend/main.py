from fastapi import FastAPI, Response, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session
from auth import (
    hash_password,
    verify_password,
    create_access_token,
    decode_access_token,
)
from database import engine, Base, SessionLocal
from models import NailColor, User
import models
import os

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)


class LoginRequest(BaseModel):
    username: str
    password: str


class ColorRequest(BaseModel):
    color: str


class AddColorRequest(BaseModel):
    brand: str
    name: str
    hex: str


class AddUserRequest(BaseModel):
    username: str
    password: str
    role: str


def hex_to_rgb(hex_color: str):
    hex_color = hex_color.lstrip("#")
    return (
        int(hex_color[0:2], 16),
        int(hex_color[2:4], 16),
        int(hex_color[4:6], 16),
    )


def color_distance(r1, g1, b1, r2, g2, b2):
    return ((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2) ** 0.5


def require_admin(request: Request):
    token = request.cookies.get("access_token")

    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    payload = decode_access_token(token)

    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")

    if payload.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

    return payload


@app.get("/")
def root():
    return {"message": "Backend is running"}


@app.get("/colors")
def get_colors():
    db: Session = SessionLocal()
    colors = db.query(NailColor).all()
    db.close()
    return colors


@app.post("/match-color")
def match_color(payload: ColorRequest):
    db: Session = SessionLocal()

    target_r, target_g, target_b = hex_to_rgb(payload.color)
    colors = db.query(NailColor).all()

    results = []
    for color in colors:
        distance = color_distance(
            target_r, target_g, target_b, color.r, color.g, color.b
        )

        results.append(
            {
                "id": color.id,
                "brand": color.brand,
                "name": color.name,
                "hex": color.hex,
                "distance": distance,
            }
        )

    db.close()
    results.sort(key=lambda x: x["distance"])
    return results[:5]


@app.post("/admin/add-color")
def add_color(payload: AddColorRequest, request: Request):
    require_admin(request)

    db: Session = SessionLocal()

    r, g, b = hex_to_rgb(payload.hex)

    new_color = NailColor(
        brand=payload.brand,
        name=payload.name,
        hex=payload.hex,
        r=r,
        g=g,
        b=b,
        lab_l=0,
        lab_a=0,
        lab_b=0,
    )

    db.add(new_color)
    db.commit()
    db.refresh(new_color)
    db.close()

    return {
        "message": "Color added successfully",
        "color": {
            "id": new_color.id,
            "brand": new_color.brand,
            "name": new_color.name,
            "hex": new_color.hex,
            "r": new_color.r,
            "g": new_color.g,
            "b": new_color.b,
        },
    }


@app.delete("/colors/{color_id}")
def delete_color(color_id: int, request: Request):
    require_admin(request)

    db: Session = SessionLocal()

    color = db.query(NailColor).filter(NailColor.id == color_id).first()

    if not color:
        db.close()
        return {"message": "Color not found"}

    db.delete(color)
    db.commit()
    db.close()

    return {"message": "Color deleted successfully"}


@app.post("/admin/add-user")
def add_user(payload: AddUserRequest, request: Request):
    require_admin(request)

    db: Session = SessionLocal()

    existing_user = db.query(User).filter(User.username == payload.username).first()
    if existing_user:
        db.close()
        return {"message": "Username already exists"}

    new_user = User(
        username=payload.username,
        password=hash_password(payload.password),
        role=payload.role,
        is_active=True,
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    db.close()

    return {
        "message": "User added successfully",
        "user": {
            "id": new_user.id,
            "username": new_user.username,
            "role": new_user.role,
            "is_active": new_user.is_active,
        },
    }


@app.post("/login")
def login(payload: LoginRequest, response: Response):
    db: Session = SessionLocal()

    user = db.query(User).filter(User.username == payload.username).first()

    db.close()

    if not user:
        return {"message": "Invalid username or password"}

    if not user.is_active:
        return {"message": "User is inactive"}

    if not verify_password(payload.password, user.password):
        return {"message": "Invalid username or password"}

    access_token = create_access_token(
        data={
            "sub": user.username,
            "role": user.role,
            "user_id": user.id,
        }
    )

    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        samesite="none",
        secure=False,
    )

    return {
        "message": "Login successful",
        "user": {
            "id": user.id,
            "username": user.username,
            "role": user.role,
        },
    }


@app.get("/me")
def get_current_user(request: Request):
    token = request.cookies.get("access_token")

    if not token:
        return {"message": "Not authenticated"}

    payload = decode_access_token(token)

    if not payload:
        return {"message": "Invalid token"}

    return {
        "user": {
            "id": payload.get("user_id"),
            "username": payload.get("sub"),
            "role": payload.get("role"),
        }
    }


@app.post("/logout")
def logout(response: Response):
    response.delete_cookie("access_token")
    return {"message": "Logged out successfully"}


@app.get("/admin/users")
def get_users(request: Request):
    require_admin(request)

    db: Session = SessionLocal()
    users = db.query(User).all()
    db.close()

    return users


@app.delete("/admin/users/{user_id}")
def delete_user(user_id: int, request: Request):
    payload = require_admin(request)

    current_user_id = payload.get("user_id")

    if current_user_id == user_id:
        raise HTTPException(
            status_code=400, detail="You cannot delete your own account"
        )

    db: Session = SessionLocal()

    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        db.close()
        return {"message": "User not found"}

    db.delete(user)
    db.commit()
    db.close()

    return {"message": "User deleted successfully"}
