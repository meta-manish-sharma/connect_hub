defmodule ConnectHubWeb.CallController do
  use ConnectHubWeb, :controller

  def index(conn, _params) do
    render(conn, "index.html")
  end
end
