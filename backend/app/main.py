from fastapi import FastAPI

from app.api.leads import router as leads_router


app = FastAPI(
    title="LeadFlow API",
    version="0.1.0",
)


app.include_router(
    leads_router,
    prefix="/api/v1",
)


@app.get("/health")
def health():
    return {"status": "ok"}
