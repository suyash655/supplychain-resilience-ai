"""
SynChain 2.0 — Graph Intelligence Engine
==========================================
Models the supply chain as a directed graph and performs network analysis.
Uses networkx for graph operations.
"""

import networkx as nx  # type: ignore
import pandas as pd  # type: ignore
import numpy as np  # type: ignore
from typing import Dict, List, Any, Optional
from collections import defaultdict


class SupplyChainGraph:
    """Supply chain modeled as a directed weighted graph."""

    def __init__(self):
        self.G = nx.DiGraph()
        self._built = False

    def build_from_data(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Build supply chain graph from transaction data."""
        self.G.clear()

        # Add supplier nodes
        if "supplier" in df.columns:
            for supplier in df["supplier"].dropna().unique():
                subset = df[df["supplier"] == supplier]
                delays = pd.to_numeric(subset.get("delay_days", pd.Series([0])), errors="coerce").fillna(0)
                costs = pd.to_numeric(subset.get("cost", pd.Series([0])), errors="coerce").fillna(0)
                self.G.add_node(
                    f"supplier:{supplier}",
                    type="supplier",
                    name=str(supplier),
                    shipments=len(subset),
                    avg_delay=round(float(delays.mean()), 1),  # type: ignore[call-overload, arg-type]
                    total_cost=round(float(costs.sum()), 2),  # type: ignore[call-overload, arg-type]
                )

        # Add SKU nodes
        if "sku" in df.columns:
            for sku in df["sku"].dropna().unique():
                subset = df[df["sku"] == sku]
                self.G.add_node(
                    f"sku:{sku}",
                    type="sku",
                    name=str(sku),
                    volume=len(subset),
                )

        # Add warehouse nodes
        if "warehouse" in df.columns:
            for wh in df["warehouse"].dropna().unique():
                subset = df[df["warehouse"] == wh]
                self.G.add_node(
                    f"warehouse:{wh}",
                    type="warehouse",
                    name=str(wh),
                    throughput=len(subset),
                )

        # Add region nodes
        if "region" in df.columns:
            for region in df["region"].dropna().unique():
                subset = df[df["region"] == region]
                self.G.add_node(
                    f"region:{region}",
                    type="region",
                    name=str(region),
                    activity=len(subset),
                )

        # Build strictly sequential edges from transaction lifecycle
        # Flow: Supplier -> SKU -> Warehouse -> Region
        for _, row in df.iterrows():
            supplier = row.get("supplier")
            sku = row.get("sku")
            warehouse = row.get("warehouse")
            region = row.get("region")
            delay = float(row.get("delay_days", 0) or 0)
            cost = float(row.get("cost", 0) or 0)

            # 1. Supplier -> SKU (Supply)
            if pd.notna(supplier) and pd.notna(sku):
                u, v = f"supplier:{supplier}", f"sku:{sku}"
                if self.G.has_edge(u, v):
                    self.G[u][v]["weight"] += 1
                else:
                    self.G.add_edge(u, v, edge_type="supplies", weight=1, total_delay=delay, total_cost=cost)

            # 2. SKU -> Warehouse (Storage)
            if pd.notna(sku) and pd.notna(warehouse):
                u, v = f"sku:{sku}", f"warehouse:{warehouse}"
                if self.G.has_edge(u, v):
                    self.G[u][v]["weight"] += 1
                else:
                    self.G.add_edge(u, v, edge_type="stored_at", weight=1)

            # 3. Warehouse -> Region (Distribution)
            if pd.notna(warehouse) and pd.notna(region):
                u, v = f"warehouse:{warehouse}", f"region:{region}"
                if self.G.has_edge(u, v):
                    self.G[u][v]["weight"] += 1
                else:
                    self.G.add_edge(u, v, edge_type="serves", weight=1)

        self._built = True
        return self.get_graph_summary()

    def get_graph_summary(self) -> Dict[str, Any]:
        """Get graph overview statistics and resilience metrics."""
        if not self._built:
            return {"error": "Graph not built yet"}

        node_types: Dict[str, int] = defaultdict(int)
        for _, data in self.G.nodes(data=True):
            node_types[data.get("type", "unknown")] += 1  # type: ignore[index, operator]

        summary = {
            "total_nodes": self.G.number_of_nodes(),
            "total_edges": self.G.number_of_edges(),
            "node_types": dict(node_types),
            "density": round(float(nx.density(self.G)), 4),  # type: ignore[call-overload]
            "is_connected": nx.is_weakly_connected(self.G) if self.G.number_of_nodes() > 0 else False,
            "components": nx.number_weakly_connected_components(self.G) if self.G.number_of_nodes() > 0 else 0,
            "resilience_metrics": self.get_resilience_metrics(),
        }
        return summary

    def get_resilience_metrics(self) -> Dict[str, Any]:
        """Compute advanced supply chain resilience metrics."""
        if self.G.number_of_nodes() == 0:
            return {}

        try:
            # Avg path length in weakly connected components
            path_lengths = []
            for component in nx.weakly_connected_components(self.G):
                subgraph = self.G.subgraph(component)
                if len(subgraph) > 1:
                    lengths = nx.average_shortest_path_length(subgraph)
                    path_lengths.append(lengths)
            
            avg_path_len = np.mean(path_lengths) if path_lengths else 0
            
            # Algebraic connectivity (Fiedler value) - requires undirected version
            undirected = self.G.to_undirected()
            connectivity = nx.algebraic_connectivity(undirected, method='lanczos') if nx.is_connected(undirected) else 0
            
        except:
            avg_path_len = 0
            connectivity = 0

        return {
            "network_resilience_score": round(float(min(100, (1/(avg_path_len+1) * 50) + (connectivity * 50))), 1) if avg_path_len > 0 else 50.0,
            "systemic_risk_index": round(float(nx.degree_pearson_correlation_coefficient(self.G)), 3) if len(self.G.edges) > 2 else 0,
            "avg_path_length": round(float(avg_path_len), 2),
            "structural_robustness": "High" if connectivity > 0.5 else "Medium" if connectivity > 0.1 else "Low",
        }

    def get_centrality_scores(self) -> Dict[str, List[Dict]]:
        """Compute centrality metrics for all nodes."""
        if not self._built or self.G.number_of_nodes() == 0:
            return {"degree": [], "betweenness": [], "pagerank": []}

        # Degree centrality
        degree = nx.degree_centrality(self.G)

        # Betweenness centrality
        betweenness = nx.betweenness_centrality(self.G, weight="weight")

        # PageRank
        try:
            pagerank = nx.pagerank(self.G, weight="weight")
        except:
            pagerank = {n: 1.0 / self.G.number_of_nodes() for n in self.G.nodes()}

        # Format results
        def format_scores(scores: dict, metric_name: str) -> List[Dict]:
            result = []
            for node, score in sorted(scores.items(), key=lambda x: x[1], reverse=True):
                data = self.G.nodes[node]
                result.append({
                    "node_id": node,
                    "name": data.get("name", node),
                    "type": data.get("type", "unknown"),
                    metric_name: round(float(score), 4),  # type: ignore[call-overload]
                })
            return list(result)[:20]  # type: ignore[index]

        return {
            "degree": format_scores(degree, "degree_centrality"),
            "betweenness": format_scores(betweenness, "betweenness_centrality"),
            "pagerank": format_scores(pagerank, "pagerank_score"),
        }

    def simulate_cascade(self, failed_node: str) -> Dict[str, Any]:
        """Simulate what happens if a specific node fails (cascade analysis)."""
        if not self._built or failed_node not in self.G:
            # Try to find partial match
            matches = [n for n in self.G.nodes() if failed_node.lower() in n.lower()]
            if matches:
                failed_node = matches[0]
            else:
                return {"error": f"Node '{failed_node}' not found", "available_nodes": list(self.G.nodes())[:20]}  # type: ignore[index]

        # Get directly affected nodes
        successors = list(self.G.successors(failed_node))
        predecessors = list(self.G.predecessors(failed_node))

        # BFS to find all downstream affected nodes
        affected = set()
        queue = list(successors)
        visited = {failed_node}

        while queue:
            current = queue.pop(0)
            if current in visited:
                continue
            visited.add(current)
            affected.add(current)
            queue.extend(self.G.successors(current))

        # Calculate impact
        node_data = self.G.nodes[failed_node]
        affected_details = []
        for node in affected:
            data = self.G.nodes[node]
            # Estimate Time-to-Recover based on node type
            ttr_base = {"supplier": 14, "warehouse": 7, "sku": 5, "region": 3}.get(data.get("type"), 5)
            
            affected_details.append({
                "node_id": node,
                "name": data.get("name", node),
                "type": data.get("type", "unknown"),
                "impact_level": "direct" if node in successors else "cascade",
                "estimated_ttr_days": ttr_base,
            })

        return {
            "failed_node": {
                "id": failed_node,
                "name": node_data.get("name", failed_node),
                "type": node_data.get("type", "unknown"),
            },
            "direct_dependencies": len(successors),
            "total_affected": len(affected),
            "cascade_depth": self._cascade_depth(failed_node),
            "affected_nodes": affected_details,
            "upstream_nodes": [
                {"node_id": n, "name": self.G.nodes[n].get("name", n)}
                for n in predecessors
            ],
            "risk_assessment": self._cascade_risk(failed_node, affected),
            "recovery_complexity": "High" if len(affected) > 10 else "Medium" if len(affected) > 3 else "Low",
        }

    def _cascade_depth(self, start_node: str) -> int:
        """Compute maximum cascade depth from a node."""
        try:
            lengths = nx.single_source_shortest_path_length(self.G, start_node)
            return max(lengths.values()) if lengths else 0
        except:
            return 0

    def _cascade_risk(self, failed_node: str, affected: set) -> str:
        """Assess the risk level of a cascade failure."""
        total_nodes = self.G.number_of_nodes()
        if total_nodes == 0:
            return "unknown"

        impact_pct = len(affected) / total_nodes * 100
        if impact_pct > 50:
            return "catastrophic"
        elif impact_pct > 25:
            return "severe"
        elif impact_pct > 10:
            return "significant"
        else:
            return "contained"

    def get_nodes_and_edges(self) -> Dict[str, Any]:
        """Get full graph data for visualization."""
        nodes = []
        for node_id, data in self.G.nodes(data=True):
            nodes.append({
                "id": node_id,
                "name": data.get("name", node_id),
                "type": data.get("type", "unknown"),
                **{k: v for k, v in data.items() if k not in ("name", "type")},
            })

        edges = []
        for source, target, data in self.G.edges(data=True):
            edges.append({
                "source": source,
                "target": target,
                "edge_type": data.get("edge_type", "unknown"),
                "weight": data.get("weight", 1),
            })

        return {"nodes": nodes, "edges": edges}

    def find_critical_paths(self) -> List[Dict]:
        """Find the most critical paths in the supply chain."""
        if not self._built or self.G.number_of_nodes() == 0:
            return []

        critical_paths = []

        # Find nodes with high betweenness (bottlenecks)
        betweenness = nx.betweenness_centrality(self.G, weight="weight")
        bottlenecks = list(sorted(betweenness.items(), key=lambda x: x[1], reverse=True))[:5]  # type: ignore[index]

        for node, score in bottlenecks:
            data = self.G.nodes[node]
            in_degree = self.G.in_degree(node)
            out_degree = self.G.out_degree(node)
            critical_paths.append({
                "node_id": node,
                "name": data.get("name", node),
                "type": data.get("type", "unknown"),
                "betweenness_score": round(float(score), 4),  # type: ignore[call-overload]
                "in_connections": in_degree,
                "out_connections": out_degree,
                "bottleneck_risk": "high" if float(score) > 0.3 else "medium" if float(score) > 0.1 else "low",
            })

        return critical_paths
