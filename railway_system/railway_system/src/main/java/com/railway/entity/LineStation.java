package com.railway.entity;

import lombok.Data;

/**
 * 线路站点关联实体类
 */
@Data
public class LineStation {
    private Integer id;
    private Integer lineId;           // 运营线路编码
    private Integer stationId;        // 站点ID
    private Integer lineStationId;    // 线路站点ID
    private Integer prevStationId;    // 上一站ID
    private Integer nextStationId;    // 下一站ID
    private Double distance;          // 站间距离
    private Double totalDistance;     // 运输距离
    private String lineCode;          // 线路代码
    private Integer isStop;           // 是否停靠
}
