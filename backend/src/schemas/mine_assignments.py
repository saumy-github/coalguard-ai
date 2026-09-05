from pydantic import BaseModel


class CreateMineAssignmentRequest(BaseModel):
    user_id: str
    mine_id: str


class MineAssignmentResponse(BaseModel):
    id: str
    user_id: str
    mine_id: str
    role: str
    active: bool
