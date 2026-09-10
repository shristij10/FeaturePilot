from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.auth import router as auth_router
from app.api.environment import router as environment_router
from app.api.environment_override import router as environment_override_router
from app.api.feature_evaluation import router as feature_evaluation_router
from app.api.feature_flag import router as feature_flag_router
from app.api.flag_evaluation import router as flag_evaluation_router
from app.routers.users import router as users_router
from app.routers.audit_logs import router as audit_logs_router
from app.routers.user_groups import router as user_groups_router
from app.routers.targeting_rules import router as targeting_rules_router
from app.routers.analytics import router as analytics_router

app = FastAPI(
    title="Application Feature Management and Release Control System",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(users_router)
app.include_router(audit_logs_router)
app.include_router(user_groups_router)
app.include_router(targeting_rules_router)
app.include_router(environment_router)
app.include_router(feature_flag_router)
app.include_router(environment_override_router)
app.include_router(feature_evaluation_router)
app.include_router(flag_evaluation_router)
app.include_router(analytics_router)


@app.get("/")
def home():
    return {
        "message": "Application Feature Management and Release Control System"
    }

